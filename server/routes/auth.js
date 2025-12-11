const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authLimiter, registrationLimiter } = require('../middleware/rateLimiter');

const JWT_SECRET = process.env.JWT_SECRET || 'media-connector-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const DISABLE_AUTH = process.env.DISABLE_AUTH === 'true';

// Guest mode auto-login (if auth is disabled)
router.get('/guest', async (req, res) => {
  try {
    if (!DISABLE_AUTH) {
      return res.status(403).json({ error: 'Guest mode is not enabled' });
    }

    // Create guest user token (not persisted to database)
    const guestUser = {
      id: 'guest',
      username: 'Guest',
      role: 'User'
    };

    const token = jwt.sign(
      { id: guestUser.id, username: guestUser.username, role: guestUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user: guestUser });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.verifyPassword(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify token
router.get('/verify', authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get user preferences
router.get('/preferences', authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const preferences = await User.getPreferences(decoded.id);
    
    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user preferences
router.put('/preferences', authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Invalid preferences format' });
    }

    const updatedPreferences = await User.updatePreferences(decoded.id, preferences);
    
    res.json({ preferences: updatedPreferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forgot password - generates new random password and logs it
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const newPassword = await User.resetPasswordToRandom(username);
    
    res.json({ 
      message: 'Password has been reset. Check Docker logs for the new password.',
      hint: `Password logged for user: ${username}`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create user (admin only)
router.post('/users', registrationLimiter, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.createUser(username, password, role || 'User');
    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/users/:id', authLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.updateUser(id, updates);
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current user from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Prevent user from deleting their own account if they are the last admin
    if (decoded.id === id) {
      const user = await User.findById(id);
      if (user && user.role === 'Admin') {
        const allUsers = await User.getAllUsers();
        const adminCount = allUsers.filter(u => u.role === 'Admin').length;
        if (adminCount <= 1) {
          return res.status(403).json({ error: 'Cannot delete your own account when you are the last admin' });
        }
      }
    }
    
    await User.deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset user password (admin only)
router.post('/users/:id/reset-password', authLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = await User.updateUser(id, { password });
    res.json({ message: 'Password reset successfully', user });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile  
router.get('/profile', authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update current user profile
router.put('/profile', authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { username, password, currentPassword } = req.body;

    // Verify current password before allowing changes
    if (currentPassword) {
      const user = await User.findById(decoded.id);
      const isValid = await User.verifyPassword(user.username, currentPassword);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const updates = {};
    if (username) updates.username = username;
    if (password) updates.password = password;

    const updatedUser = await User.updateUser(decoded.id, updates);
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
