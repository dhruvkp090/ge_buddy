# GE Buddy - Focus & Productivity Chrome Extension

GE Buddy is a Chrome extension designed to help you manage your time and maintain focus by controlling access to different types of websites. It categorizes websites into different types and implements waiting periods and time limits to promote mindful browsing.

## Features

### Website Categories
- **Fun Websites**: Entertainment and leisure sites
- **Fun & Work Websites**: Sites that can be used for both work and entertainment
- **Social Media**: Social networking and communication platforms

### Time Management Features
- **Waiting Periods**: Enforces a cooling-off period before accessing categorized websites
- **Access Duration**: Limits how long you can browse a website in one session
- **Purpose Selection**: For Fun & Work websites, choose whether you're using them for work or leisure
- **Custom Timers**: Set custom access durations for different website categories

### User Interface
- **Clean, Modern Design**: Intuitive interface with color-coded categories
- **Real-time Timers**: 
  - Countdown for remaining access time
  - Waiting period timer
  - Time until next access allowed
- **Category Management**: Easy addition and removal of websites from categories
- **Settings Panel**: Customize waiting times and access durations

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ge_buddy.git
   cd ge_buddy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build` directory from your project folder

## Usage

### Adding Websites to Categories
1. Visit any website
2. Click the GE Buddy extension icon
3. Select the appropriate category (Fun, Fun & Work, or Social Media)
4. The website is now managed by GE Buddy

### Accessing Managed Websites
1. When you visit a managed website, you'll see:
   - The website category
   - A waiting period timer (if applicable)
   - Remaining access time (when actively browsing)
   - Time until next access (if temporarily blocked)

2. For Fun & Work websites:
   - Choose whether you're using it for work or fun
   - Different time limits apply based on your selection

### Customizing Settings
1. Click the extension icon
2. Click "Open Settings"
3. Adjust waiting times and access durations for each category
4. Manage your list of categorized websites

## Configuration

Default settings can be modified in the Settings panel:

```javascript
{
  "fun": {
    "waitTime": 5,      // minutes
    "accessDuration": 5  // minutes
  },
  "funAndWork": {
    "fun": {
      "waitTime": 5,
      "accessDuration": 5
    },
    "work": {
      "waitTime": 2,
      "accessDuration": 30
    }
  },
  "socialMedia": {
    "waitTime": 15,
    "accessDuration": 5
  }
}
```

## Development

### Project Structure
```
ge_buddy/
├── public/
│   ├── index.html
│   └── redirect.js
├── src/
│   ├── components/
│   │   ├── Popup.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   ├── utils/
│   │   └── urlUtils.ts
│   └── types/
│       └── website.ts
├── extension/
│   ├── background/
│   │   └── background.ts
│   └── manifest.json
└── package.json
```

### Technology Stack
- React with TypeScript
- Tailwind CSS for styling
- Chrome Extension APIs
- Local Storage for persistence

### Building for Development
```bash
npm run start
```

### Building for Production
```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React and TypeScript
- Styled with Tailwind CSS
- Chrome Extension APIs
- Special thanks to all contributors

## Support

For support, please open an issue in the GitHub repository or contact the maintainers. 