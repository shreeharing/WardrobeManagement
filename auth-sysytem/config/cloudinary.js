const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: 'dlipnafu3',
  api_key: '855791761744777',
  api_secret: 'bE1eaiiW-1rjTLsDW9-pJxHGgDE'
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'wardrobe', // Folder name on Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});

const upload = multer({ storage });

module.exports = { cloudinary, upload };
