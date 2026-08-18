import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'

// configure cloudinary

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY__API_KEY,
    api_secret: process.env.CLOUDINARY__API_SECRET,
})

// upload the files to cloudinary
export async function uploadToCloudinary (filePath, folder = "Doctor"){
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: "image"
        });

        // remove the local file after upload
        fs.unlinkSync(filePath);
        return result;
    } catch (err) {
        console.error("CLoudinary upload error:", err)
        return err;
    }
}

// to delete the image this is present in cloudinary if the user removes from the UI
export async function deleteFromCloudinary(publicId) {
    try {
        if(!publicId) return;
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error("CLoudinary delete error:", err)
        throw err;
    }
}

export default cloudinary;