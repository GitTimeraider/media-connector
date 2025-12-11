import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Visibility, VisibilityOff, Save, ViewModule, ViewList } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [defaultViewMode, setDefaultViewMode] = useState('cards');
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await api.getPreferences();
      if (prefs.defaultViewMode) {
        setDefaultViewMode(prefs.defaultViewMode);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPreferencesLoading(true);

    try {
      await api.updatePreferences({ defaultViewMode });
      setSuccess('Preferences updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update preferences');
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    if (!currentPassword && newPassword) {
      setError('Current password is required to change password');
      return;
    }

    setLoading(true);

    try {
      const updates = {};
      if (username !== user.username) updates.username = username;
      if (newPassword) updates.password = newPassword;
      if (currentPassword) updates.currentPassword = currentPassword;

      const updatedUser = await api.updateProfile(updates);
      updateUser(updatedUser);
      setSuccess('Profile updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        My Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handlePreferencesSubmit}>
            <Typography variant="h6" gutterBottom>
              Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Customize your default view settings
            </Typography>

            <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
              <InputLabel>Default View Mode (Movies & TV Shows)</InputLabel>
              <Select
                value={defaultViewMode}
                label="Default View Mode (Movies & TV Shows)"
                onChange={(e) => setDefaultViewMode(e.target.value)}
                disabled={preferencesLoading}
              >
                <MenuItem value="cards">
                  <Box display="flex" alignItems="center" gap={1}>
                    <ViewModule fontSize="small" />
                    Cards
                  </Box>
                </MenuItem>
                <MenuItem value="list">
                  <Box display="flex" alignItems="center" gap={1}>
                    <ViewList fontSize="small" />
                    List
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={preferencesLoading}
              startIcon={preferencesLoading ? <CircularProgress size={20} /> : <Save />}
            >
              {preferencesLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              sx={{ mb: 3, mt: 2 }}
              required
            />

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Change Password
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Leave password fields empty if you don't want to change your password
            </Typography>

            <TextField
              fullWidth
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      edge="end"
                    >
                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <TextField
              fullWidth
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
              error={newPassword !== '' && confirmPassword !== '' && newPassword !== confirmPassword}
              helperText={
                newPassword !== '' && confirmPassword !== '' && newPassword !== confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              sx={{ mt: 2 }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Profile;
