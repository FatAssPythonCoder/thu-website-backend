# Thu Website Backend

This folder contains the backend server for the Thu fashion website.

## Files

- `server.js` - Main server file
- `package.json` - Node.js dependencies
- `gallery-data.json` - Gallery data storage
- `start.bat` - Windows batch file to start the server

## How to Start

1. Open terminal/command prompt
2. Navigate to this folder: `cd backend`
3. Run: `node server.js`
   - Or double-click `start.bat` on Windows

## Server URLs

- **Main Website**: http://localhost:3000/index.html
- **Collections**: http://localhost:3000/collections.html
- **Admin Interface**: http://localhost:3000/admin-simple.html
- **API Endpoint**: http://localhost:3000/api/gallery

## API Endpoints

- `GET /api/gallery` - Get all gallery items
- `POST /api/gallery` - Update all gallery items
- `POST /api/gallery/add` - Add new gallery item
- `DELETE /api/gallery/:index` - Remove gallery item by index

## Dependencies

- express
- cors
- fs (built-in)
- path (built-in)

