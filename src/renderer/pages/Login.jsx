import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isSignup) {
        if (!formData.name.trim()) {
          throw new Error('Please enter your name');
        }
        result = await signup(formData.name, formData.email, formData.password);
      } else {
        result = await login(formData.email, formData.password);
      }

      if (!result.success) {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Simulate Google login
    login('user@gmail.com', 'google-auth');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#faf9f7',
        WebkitAppRegion: 'drag',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: 4,
          borderRadius: 3,
          border: '1px solid #e5e2de',
          WebkitAppRegion: 'no-drag',
        }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              bgcolor: '#4f8cff',
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: 24 }}>
              P
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            {isSignup ? 'Create your account' : 'Welcome to Pabbly Flow'}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            {isSignup
              ? 'Start your 14-day free trial'
              : 'Sign in to sync your settings and history'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {isSignup && (
            <TextField
              fullWidth
              name="name"
              label="Full Name"
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              required
              autoFocus={isSignup}
            />
          )}
          <TextField
            fullWidth
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
            autoFocus={!isSignup}
          />
          <TextField
            fullWidth
            name="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              mt: 2,
              py: 1.5,
              bgcolor: '#1a1a1a',
              '&:hover': { bgcolor: '#333' },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : isSignup ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>
          <Typography color="text.secondary" sx={{ fontSize: 13 }}>
            or
          </Typography>
        </Divider>

        {/* Google Login */}
        <Button
          variant="outlined"
          fullWidth
          onClick={handleGoogleLogin}
          startIcon={<GoogleIcon />}
          sx={{
            py: 1.5,
            borderColor: '#e5e2de',
            color: '#1a1a1a',
            '&:hover': { bgcolor: '#f5f3f0', borderColor: '#e5e2de' },
          }}
        >
          Continue with Google
        </Button>

        {/* Switch mode */}
        <Typography
          sx={{ textAlign: 'center', mt: 3, fontSize: 14, color: '#666' }}
        >
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link
            component="button"
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
            sx={{
              color: '#1a1a1a',
              fontWeight: 500,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Login;
