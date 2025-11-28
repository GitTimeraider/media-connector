import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, Movie } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotMessage('');
    setForgotLoading(true);

    try {
      const response = await api.forgotPassword(forgotUsername);
      setForgotMessage(response.message);
    } catch (err) {
      setForgotMessage(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(25, 118, 210, 0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'drift 20s linear infinite',
        },
        '@keyframes drift': {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(-50px, -50px)' },
        }
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            animation: 'fadeIn 0.6s ease-out',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(30px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            }
          }}
        >
          <Card
            elevation={24}
            sx={{
              backdropFilter: 'blur(20px)',
              background: 'rgba(18, 18, 18, 0.95)',
              border: '1px solid rgba(25, 118, 210, 0.3)',
              borderRadius: 4,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 60px rgba(25, 118, 210, 0.3)',
                border: '1px solid rgba(25, 118, 210, 0.5)',
              }
            }}
          >
            <CardContent sx={{ p: 5 }}>
              <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                    borderRadius: 4,
                    p: 3,
                    mb: 3,
                    boxShadow: '0 8px 32px rgba(25, 118, 210, 0.4)',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.05)' },
                    }
                  }}
                >
                  <Movie sx={{ fontSize: 56, color: 'white' }} />
                </Box>
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  gutterBottom
                  sx={{
                    color: 'white',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  }}
                >
                  Media Connector
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: '0 1px 5px rgba(0,0,0,0.2)',
                  }}
                >
                  Sign in to your account
                </Typography>
              </Box>

              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    background: 'rgba(211, 47, 47, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(211, 47, 47, 0.3)',
                    color: 'white',
                    '& .MuiAlert-icon': {
                      color: '#ff5252'
                    }
                  }}
                >
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Username"
                  variant="outlined"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  sx={{ 
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.08)',
                        '& fieldset': {
                          borderColor: 'rgba(25, 118, 210, 0.5)',
                        },
                      },
                      '&.Mui-focused': {
                        background: 'rgba(255, 255, 255, 0.08)',
                        '& fieldset': {
                          borderColor: '#1976d2',
                        },
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#1976d2',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                    },
                  }}
                  autoFocus
                  required
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.08)',
                        '& fieldset': {
                          borderColor: 'rgba(25, 118, 210, 0.5)',
                        },
                      },
                      '&.Mui-focused': {
                        background: 'rgba(255, 255, 255, 0.08)',
                        '& fieldset': {
                          borderColor: '#1976d2',
                        },
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#1976d2',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                    },
                  }}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

                <Box display="flex" justifyContent="flex-end" mb={4}>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={() => setForgotDialogOpen(true)}
                    sx={{ 
                      cursor: 'pointer',
                      color: 'rgba(255, 255, 255, 0.9)',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: 'white',
                      }
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || !username || !password}
                  startIcon={loading ? null : <LoginIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                    height: 56,
                    fontSize: 18,
                    fontWeight: 700,
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(25, 118, 210, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1565c0 0%, #7b1fa2 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 40px rgba(25, 118, 210, 0.5)',
                    },
                    '&:disabled': {
                      background: 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
                </Button>
              </Box>

              <Typography 
                variant="caption" 
                align="center" 
                display="block" 
                mt={3}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: 2,
                  borderRadius: 1,
                }}
              >
                💡 Default credentials: <strong>admin / admin</strong>
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotDialogOpen} onClose={() => setForgotDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Forgot Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter your username and a new password will be generated and logged in the Docker console.
          </Typography>
          {forgotMessage && (
            <Alert severity={forgotMessage.includes('error') ? 'error' : 'success'} sx={{ mb: 2 }}>
              {forgotMessage}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={forgotUsername}
            onChange={(e) => setForgotUsername(e.target.value)}
            disabled={forgotLoading}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleForgotPassword}
            variant="contained"
            disabled={forgotLoading || !forgotUsername}
          >
            {forgotLoading ? <CircularProgress size={20} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Login;
