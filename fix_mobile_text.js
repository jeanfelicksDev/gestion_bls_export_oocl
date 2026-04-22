const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(pageFile, 'utf8');

// Header title size
content = content.replace(/text-4xl font-black text-gray-900/g, "text-2xl md:text-4xl font-black text-gray-900");

// Search bar spacing
content = content.replace(/mb-32/g, "mb-12 md:mb-32");

// Global stats large text
content = content.replace(/text-5xl font-black text-blue-400/g, "text-4xl md:text-5xl font-black text-blue-400");
content = content.replace(/text-5xl font-black text-teal-600/g, "text-4xl md:text-5xl font-black text-teal-600");

fs.writeFileSync(pageFile, content, 'utf8');
console.log("Updated page.tsx responsive classes");
