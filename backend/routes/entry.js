// Backend API endpoint fixes for entry.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { OpenAI } = require('openai');
const cors = require('cors');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure CORS
router.use(cors({ origin: true }));

// GET all entries
router.get('/', async (req, res) => {
  try {
    console.log('Fetching entries for user:', req.headers['x-user-id']);
    const userId = req.headers['x-user-id'] || 'demo';
    
    const entriesRef = admin.firestore().collection('entries');
    const snapshot = await entriesRef.where('author_id', '==', userId).get();
    
    if (snapshot.empty) {
      console.log('No entries found for user:', userId);
      return res.json({ entries: [] });
    }
    
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({
        entry_id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Found ${entries.length} entries for user:`, userId);
    return res.json({ entries });
  } catch (error) {
    console.error('Error fetching entries:', error);
    return res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// POST new entry
router.post('/', async (req, res) => {
  try {
    console.log('Creating new entry for user:', req.headers['x-user-id']);
    const userId = req.headers['x-user-id'] || 'demo';
    const { content, tags, privacy, media_url } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const entryData = {
      content,
      tags: tags || [],
      privacy: privacy || 'private',
      author_id: userId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (media_url) {
      entryData.media_url = media_url;
    }
    
    const docRef = await admin.firestore().collection('entries').add(entryData);
    console.log('Entry created with ID:', docRef.id);
    
    return res.status(201).json({ 
      entry_id: docRef.id,
      ...entryData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating entry:', error);
    return res.status(500).json({ error: 'Failed to create entry' });
  }
});

// GET entry by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'demo';
    const entryId = req.params.id;
    
    const docRef = await admin.firestore().collection('entries').doc(entryId).get();
    
    if (!docRef.exists) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const entryData = docRef.data();
    
    // Check if user has permission to view this entry
    if (entryData.author_id !== userId && entryData.privacy !== 'shared') {
      return res.status(403).json({ error: 'Not authorized to view this entry' });
    }
    
    return res.json({
      entry_id: docRef.id,
      ...entryData
    });
  } catch (error) {
    console.error('Error fetching entry:', error);
    return res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// PUT update entry
router.put('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'demo';
    const entryId = req.params.id;
    const { content, tags, privacy, media_url } = req.body;
    
    const docRef = admin.firestore().collection('entries').doc(entryId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const entryData = doc.data();
    
    // Check if user has permission to edit this entry
    if (entryData.author_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this entry' });
    }
    
    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (privacy !== undefined) updateData.privacy = privacy;
    if (media_url !== undefined) updateData.media_url = media_url;
    
    await docRef.update(updateData);
    
    const updatedDoc = await docRef.get();
    
    return res.json({
      entry_id: updatedDoc.id,
      ...updatedDoc.data()
    });
  } catch (error) {
    console.error('Error updating entry:', error);
    return res.status(500).json({ error: 'Failed to update entry' });
  }
});

// DELETE entry
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'demo';
    const entryId = req.params.id;
    
    const docRef = admin.firestore().collection('entries').doc(entryId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const entryData = doc.data();
    
    // Check if user has permission to delete this entry
    if (entryData.author_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this entry' });
    }
    
    await docRef.delete();
    
    return res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// POST generate AI tags
router.post('/generate-tags', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ error: 'Content is too short for tag generation' });
    }
    
    console.log('Generating AI tags for content');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, using mock tags');
      return res.json({ tags: ['moment', 'memory', 'experience'] });
    }
    
    // Call OpenAI API to generate tags
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates relevant tags for journal entries. Generate 3-5 single-word tags that capture the essence of the content. Return only the tags as a comma-separated list without any additional text."
        },
        {
          role: "user",
          content: content
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });
    
    // Process the response to extract tags
    const tagText = completion.choices[0].message.content.trim();
    const tags = tagText.split(',').map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length < 20)
      .slice(0, 5); // Limit to 5 tags
    
    console.log('AI tags generated:', tags);
    
    return res.json({ tags });
  } catch (error) {
    console.error('Error generating tags:', error);
    return res.status(500).json({ error: 'Failed to generate tags' });
  }
});

module.exports = router;
