# Thu Website Backend Deployment

## Railway Deployment

### Prerequisites
1. GitHub account
2. Railway account (free at railway.app)
3. Your backend code in a GitHub repository

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/thu-website-backend.git
   git push -u origin main
   ```

2. **Deploy on Railway**
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect Node.js and deploy

3. **Set Environment Variables**
   In Railway dashboard, go to Variables tab and add:
   ```
   NODE_ENV=production
   SESSION_SECRET=your-secret-key-here
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=your-hashed-password-here
   ```

4. **Get Your Backend URL**
   - Railway will provide a URL like: `https://your-app-name.railway.app`
   - This is your backend API URL

### Update Frontend

After deployment, update your frontend to use the new backend URL:

1. **Update API calls** in your frontend files
2. **Deploy frontend** to Cloudflare Pages
3. **Test everything** works together

### Health Check

Your backend will be available at:
- `https://your-app-name.railway.app/api/health`
- `https://your-app-name.railway.app/api/gallery`
- `https://your-app-name.railway.app/api/playlist`
