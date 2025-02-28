# AI Book Summarizer Frontend

A web interface for the AI Book Summarizer project that generates summaries and mindmaps from books.

## Features
- Upload text files
- View book summaries
- Interactive mindmap visualization
- Key phrase extraction

## Deployment
This is the frontend portion of the project, designed to be deployed on Netlify.

### Deploy to Netlify
1. Fork this repository
2. Sign up on [Netlify](https://www.netlify.com/)
3. Create a new site from Git
4. Connect to your GitHub repository
5. Deploy settings:
   - Build command: `none` (no build required)
   - Publish directory: `./` (root directory)

## Configuration
Update the `API_URL` in `js/app.js` to point to your backend server:
```javascript
const API_URL = 'https://your-backend-url.herokuapp.com';
```

## Development
1. Clone the repository
2. Open `index.html` in your browser
3. For local development, you'll need to run the backend server locally

## Technologies Used
- HTML5
- CSS3
- JavaScript
- D3.js for visualizations
