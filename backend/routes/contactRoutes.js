
import express from 'express';
import Contact from '../models/Contact.js';

const router = express.Router();

// Submit contact form
router.post('/send', async (req, res) => {
    try {
        const { yourName, yourEmail, message } = req.body;

        // Validate fields
        if (!yourName || !yourEmail || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Save contact message
        const newContact = new Contact({
            yourName,
            yourEmail,
            message
        });

        await newContact.save();

        return res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            contact: newContact
        });

    } catch (error) {
        console.error('Contact Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

export default router;
