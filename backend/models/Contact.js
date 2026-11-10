
import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
    yourName: {
        type: String,
        required: true
    },
    yourEmail: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
