import mongoose from "mongoose";

export const connectDB = async () => {
  await mongoose.connect("mongodb+srv://sagheerabbas700_db_user:UynckMdGyElMimhn@cluster0.lgwy8ke.mongodb.net/MediCare")
  .then(() => {
    console.log("DB Connected")
  })
};