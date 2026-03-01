import multer from "multer";
import { BadRequestError } from "../lib/errors";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 3;

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = /^image\/(jpeg|png|webp|gif)$/i;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError("Solo se permiten imágenes (JPEG, PNG, WebP, GIF)"));
  }
};

export const uploadGameImages = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter,
}).array("images", MAX_FILES);
