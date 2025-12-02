import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  CircularProgress,
  Avatar,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  LiveTv as TvIcon,
  Movie as MovieIcon,
  CloudDownload as DownloadIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  GridView as GridViewIcon,
  Dns as DnsIcon,
  Person,
  Logout,
  PeopleAlt
} from '@mui/icons-material';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sonarr from './pages/Sonarr';
import Radarr from './pages/Radarr';
import Downloads from './pages/Downloads';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Overview from './pages/Overview';
import Unraid from './pages/Unraid';
import Portainer from './pages/Portainer';
import Users from './pages/Users';
import Profile from './pages/Profile';

const drawerWidth = 240;

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main App Layout Component
function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Overview', icon: <GridViewIcon />, path: '/overview' },
    { divider: true },
    { text: 'TV Shows', icon: <TvIcon />, path: '/sonarr' },
    { text: 'Movies', icon: <MovieIcon />, path: '/radarr' },
    { divider: true },
    { text: 'Downloads', icon: <DownloadIcon />, path: '/downloads' },
    { text: 'Search', icon: <SearchIcon />, path: '/search' },
    { divider: true },
    { text: 'Unraid', icon: <DnsIcon />, path: '/unraid' },
    { text: 'Portainer', icon: <DnsIcon />, path: '/portainer' },
    { divider: true },
    ...(isAdmin() ? [{ text: 'Users', icon: <PeopleAlt />, path: '/users' }] : []),
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', background: 'linear-gradient(180deg, rgba(18,18,18,1) 0%, rgba(30,30,30,1) 100%)' }}>
      <Toolbar sx={{ 
        background: 'linear-gradient(135deg, rgba(25,118,210,0.2) 0%, rgba(156,39,176,0.2) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        minHeight: { xs: 64, sm: 70 }
      }}>
        <Typography 
          variant="h6" 
          noWrap 
          component="div"
          sx={{
            fontWeight: 700,
            fontSize: '1.1rem',
            letterSpacing: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          Media Connector
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ py: 2, px: 1 }}>
        {menuItems.map((item, index) => 
          item.divider ? (
            <Divider key={`divider-${index}`} sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  mx: 0.5,
                  transition: 'all 0.3s',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(25,118,210,0.15) 0%, rgba(156,39,176,0.15) 100%)',
                    transform: 'translateX(8px)',
                    boxShadow: '0 4px 12px rgba(25,118,210,0.2)'
                  },
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, rgba(25,118,210,0.25) 0%, rgba(156,39,176,0.25) 100%)',
                    borderLeft: '3px solid',
                    borderImage: 'linear-gradient(to bottom, #1976d2, #9c27b0) 1',
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(25,118,210,0.3) 0%, rgba(156,39,176,0.3) 100%)'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: location.pathname === item.path ? 'primary.main' : 'rgba(255,255,255,0.7)',
                  minWidth: 40,
                  transition: 'all 0.3s',
                  '& .MuiSvgIcon-root': {
                    filter: location.pathname === item.path ? 'drop-shadow(0 2px 4px rgba(25,118,210,0.5))' : 'none'
                  }
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 600 : 400,
                    fontSize: '0.95rem',
                    color: location.pathname === item.path ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)'
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          maxWidth: '100vw',
          boxSizing: 'border-box',
          background: 'linear-gradient(135deg, rgba(25,118,210,0.95) 0%, rgba(156,39,176,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              '&:hover': {
                background: 'rgba(255,255,255,0.15)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.2s'
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              letterSpacing: 0.5,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {menuItems.find(item => item.path === location.pathname)?.text || 'Media Connector'}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.username}
            </Typography>
            <IconButton 
              onClick={handleProfileMenuOpen} 
              color="inherit"
              sx={{
                '&:hover': {
                  transform: 'scale(1.1)',
                  background: 'rgba(255,255,255,0.15)'
                },
                transition: 'all 0.2s'
              }}
            >
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                fontWeight: 600
              }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
              <Person sx={{ mr: 1 }} /> My Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: 'linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(30,30,30,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255,255,255,0.1)'
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: 'linear-gradient(180deg, rgba(18,18,18,1) 0%, rgba(30,30,30,1) 100%)',
              borderRight: '1px solid rgba(255,255,255,0.1)'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100vw',
          mt: 8,
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/sonarr" element={<Sonarr />} />
          <Route path="/radarr" element={<Radarr />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/search" element={<Search />} />
          <Route path="/unraid" element={<Unraid />} />
          <Route path="/portainer" element={<Portainer />} />
          <Route path="/users" element={<Users />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
    </Box>
  );
}

// Main App with Auth
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
