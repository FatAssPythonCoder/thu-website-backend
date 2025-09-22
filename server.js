const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.exchangerate-api.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for admin operations
  message: 'Too many admin requests from this IP, please try again later.'
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Use secure cookies only in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'assets', 'gallery');
    // Ensure the directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.originalname.toLowerCase();
    const extension = originalName.endsWith('.jpg') ? '.jpg' : '.jpg';
    cb(null, `uploaded-${timestamp}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow JPG files
    if (file.mimetype === 'image/jpeg' || file.originalname.toLowerCase().endsWith('.jpg')) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://phuongthustudio.com',
    'https://www.phuongthustudio.com',
    'https://phuongthu.pages.dev',
    'https://thu-website-backend-ught.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter); // Apply rate limiting to all routes
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from parent directory

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

// Admin credentials (in production, use environment variables)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('admin123', 10);

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    console.log('Checking credentials for:', username);
    if (username === ADMIN_USERNAME && await bcrypt.compare(password, ADMIN_PASSWORD_HASH)) {
      req.session.authenticated = true;
      req.session.username = username;
      console.log('Login successful for:', username);
      res.json({ success: true, message: 'Login successful' });
    } else {
      console.log('Invalid credentials');
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  res.json({ 
    authenticated: !!(req.session && req.session.authenticated),
    username: req.session?.username || null
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Thu Website Backend API is running!',
    status: 'OK',
    endpoints: {
      health: '/api/health',
      gallery: '/api/gallery',
      playlist: '/api/playlist',
      admin: '/admin-login.html'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Data file path
const DATA_FILE = path.join(__dirname, 'gallery-data.json');
const PLAYLIST_FILE = path.join(__dirname, 'playlist-data.json');

// Default gallery data
const defaultData = {
  galleryData: [
    { path: 'assets/gallery/bg-img2.JPG', price: '$299', status: 'available' },
    { path: 'assets/gallery/bg-img4.JPG', price: '$299', status: 'sold' },
    { path: 'assets/gallery/bg-img5.JPG', price: '$299', status: 'available' },
    { path: 'assets/gallery/bg-img10.JPG', price: '$299', status: 'available' },
    { path: 'assets/gallery/bg-img11.JPG', price: '$299', status: 'sold' },
    { path: 'assets/gallery/bg-img13.jpg', price: '$299', status: 'available' },
    { path: 'assets/gallery/bg-img.JPG', price: '$299', status: 'available' }
  ],
  lastUpdated: new Date().toISOString()
};

// Default playlist data
const defaultPlaylistData = {
  playlist: [
    'assets/gallery/bg-img.JPG',
    'assets/gallery/bg-img1.JPG',
    'assets/gallery/bg-img2.JPG',
    'assets/gallery/bg-img3.JPG',
    'assets/gallery/bg-img4.JPG',
    'assets/gallery/bg-img5.JPG',
    'assets/gallery/bg-img6.JPG',
    'assets/gallery/bg-img7.JPG',
    'assets/gallery/bg-img8.JPG',
    'assets/gallery/bg-img9.JPG',
    'assets/gallery/bg-img10.JPG',
    'assets/gallery/bg-img11.JPG',
    'assets/gallery/bg-img12.JPG',
    'assets/gallery/bg-img13.jpg',
    'assets/gallery/bg-img14.JPG'
  ],
  lastUpdated: new Date().toISOString()
};

// Load data from file or create default
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('Error loading data, using default:', error.message);
  }
  return defaultData;
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data:', error.message);
    return false;
  }
}

// Load playlist data from file or create default
function loadPlaylistData() {
  try {
    if (fs.existsSync(PLAYLIST_FILE)) {
      const data = fs.readFileSync(PLAYLIST_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('Error loading playlist data, using default:', error.message);
  }
  return defaultPlaylistData;
}

// Save playlist data to file
function savePlaylistData(data) {
  try {
    fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving playlist data:', error.message);
    return false;
  }
}

// Collections page now loads data dynamically from API
// No need to update the HTML file anymore

// API Routes

// Get all gallery data
app.get('/api/gallery', (req, res) => {
  const data = loadData();
  res.json(data);
});

// Get playlist data
app.get('/api/playlist', (req, res) => {
  const data = loadPlaylistData();
  res.json(data);
});

// Update playlist data (protected)
app.post('/api/playlist', strictLimiter, requireAuth, (req, res) => {
  const { playlist } = req.body;
  
  if (!playlist || !Array.isArray(playlist)) {
    return res.status(400).json({ error: 'Invalid playlist data' });
  }
  
  // Input validation
  if (playlist.length > 100) {
    return res.status(400).json({ error: 'Playlist too long' });
  }
  
  const data = {
    playlist,
    lastUpdated: new Date().toISOString()
  };
  
  if (savePlaylistData(data)) {
    res.json({ success: true, message: 'Playlist updated successfully!' });
  } else {
    res.status(500).json({ error: 'Failed to save playlist data' });
  }
});

// Update gallery data (protected)
app.post('/api/gallery', strictLimiter, requireAuth, (req, res) => {
  const { galleryData } = req.body;
  
  if (!galleryData || !Array.isArray(galleryData)) {
    return res.status(400).json({ error: 'Invalid gallery data' });
  }
  
  const data = {
    galleryData,
    lastUpdated: new Date().toISOString()
  };
  
  if (saveData(data)) {
    res.json({ success: true, message: 'Gallery updated successfully!' });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Add new item (protected)
app.post('/api/gallery/add', strictLimiter, requireAuth, (req, res) => {
  const { path, price, status } = req.body;
  
  if (!path || !status) {
    return res.status(400).json({ error: 'Path and status are required' });
  }
  
  // Input validation
  if (typeof path !== 'string' || path.length > 500) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const data = loadData();
  const newItem = { path, price: price || '$299', status };
  
  data.galleryData.push(newItem);
  data.lastUpdated = new Date().toISOString();
  
  if (saveData(data)) {
    res.json({ success: true, message: 'Item added successfully!' });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Remove item (protected)
app.delete('/api/gallery/:index', strictLimiter, requireAuth, (req, res) => {
  const index = parseInt(req.params.index);
  
  if (isNaN(index) || index < 0) {
    return res.status(400).json({ error: 'Invalid index' });
  }
  
  const data = loadData();
  
  if (index >= data.galleryData.length) {
    return res.status(400).json({ error: 'Index out of range' });
  }
  
  data.galleryData.splice(index, 1);
  data.lastUpdated = new Date().toISOString();
  
  if (saveData(data)) {
    res.json({ success: true, message: 'Item removed successfully!' });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Update item (protected)
app.put('/api/gallery/:index', strictLimiter, requireAuth, (req, res) => {
  const index = parseInt(req.params.index);
  
  if (isNaN(index) || index < 0) {
    return res.status(400).json({ error: 'Invalid index' });
  }
  
  const { path, images, price, status } = req.body;
  
  if (!path || !status) {
    return res.status(400).json({ error: 'Path and status are required' });
  }
  
  // Input validation
  if (typeof path !== 'string' || path.length > 500) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  const data = loadData();
  
  if (index >= data.galleryData.length) {
    return res.status(400).json({ error: 'Index out of range' });
  }
  
  // Update the item - preserve existing id if it exists
  const existingItem = data.galleryData[index];
  data.galleryData[index] = {
    ...existingItem, // Preserve existing properties like id
    path,
    images: images || [path], // Use provided images array or fallback to single path
    price: price || '$299',
    status
  };
  data.lastUpdated = new Date().toISOString();
  
  if (saveData(data)) {
    res.json({ success: true, message: 'Item updated successfully!' });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Currency conversion endpoint
app.get('/api/currency/convert', async (req, res) => {
  try {
    const { amount, from = 'USD', to = 'VND' } = req.query;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    // Use ExchangeRate-API (free tier: 1500 requests/month)
    const apiKey = process.env.EXCHANGE_RATE_API_KEY || 'demo'; // Will use demo key if not set
    const apiUrl = `https://api.exchangerate-api.com/v4/latest/${from}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rates || !data.rates[to]) {
      return res.status(400).json({ error: `Currency ${to} not supported` });
    }
    
    const rate = data.rates[to];
    const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
    
    res.json({
      success: true,
      original: {
        amount: parseFloat(amount),
        currency: from
      },
      converted: {
        amount: parseFloat(convertedAmount),
        currency: to,
        rate: rate
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Currency conversion error:', error);
    
    // Fallback to static rates if API fails
    const fallbackRates = {
      'USD': { 'VND': 24750, 'GBP': 0.79 },
      'VND': { 'USD': 0.000040, 'GBP': 0.000032 },
      'GBP': { 'USD': 1.27, 'VND': 31329 }
    };
    
    const { amount, from = 'USD', to = 'VND' } = req.query;
    
    if (fallbackRates[from] && fallbackRates[from][to]) {
      const rate = fallbackRates[from][to];
      const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
      
      res.json({
        success: true,
        original: {
          amount: parseFloat(amount),
          currency: from
        },
        converted: {
          amount: parseFloat(convertedAmount),
          currency: to,
          rate: rate
        },
        timestamp: new Date().toISOString(),
        note: 'Using fallback rates - API unavailable'
      });
    } else {
      res.status(500).json({ error: 'Currency conversion failed' });
    }
  }
});

// Get available currencies
app.get('/api/currency/rates', async (req, res) => {
  try {
    const { from = 'USD' } = req.query;
    const apiUrl = `https://api.exchangerate-api.com/v4/latest/${from}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // Filter to only our target currencies
    const targetCurrencies = ['USD', 'GBP', 'VND'];
    const rates = {};
    
    targetCurrencies.forEach(currency => {
      if (data.rates && data.rates[currency]) {
        rates[currency] = data.rates[currency];
      }
    });
    
    res.json({
      success: true,
      base: from,
      rates: rates,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Currency rates error:', error);
    
    // Fallback rates
    const fallbackRates = {
      'USD': { 'VND': 24750, 'GBP': 0.79 },
      'VND': { 'USD': 0.000040, 'GBP': 0.000032 },
      'GBP': { 'USD': 1.27, 'VND': 31329 }
    };
    
    res.json({
      success: true,
      base: req.query.from || 'USD',
      rates: fallbackRates[req.query.from || 'USD'] || fallbackRates['USD'],
      timestamp: new Date().toISOString(),
      note: 'Using fallback rates - API unavailable'
    });
  }
});

// Upload file endpoint (protected)
app.post('/api/upload', strictLimiter, requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Additional file validation
    if (req.file.size > 10 * 1024 * 1024) { // 10MB limit
      return res.status(400).json({ error: 'File too large' });
    }

    const filePath = `assets/gallery/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'File uploaded successfully!',
      filePath: filePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});


// Start server with HTTPS support
function startServer() {
  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📱 Admin interface: /admin-login.html`);
    console.log(`🌐 Website: /index.html`);
    console.log(`🛍️ Collections: /collections.html`);
    console.log(`🔧 Health check: /api/health`);
  });
}


// Export for Vercel
module.exports = app;

// Start server
startServer();
