import multer from "multer";

const storage = multer.diskStorage({
  destination: (_, file, cb) => {
    cb(null, "src/public/temp");
  },
  filename: (_, file, cb) => {
    cb(null, file.originalname + "-" + Date.now());
  },
});

export const upload = multer({ storage });
