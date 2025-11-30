import React from 'react';
import { Container, Typography, Alert } from '@mui/material';

function Readarr() {
  return (
    <Container maxWidth="xl" sx={{ overflowX: 'hidden', width: '100%' }}>
      <Typography variant="h4" gutterBottom>Books</Typography>
      <Alert severity="info">
        Configure Readarr in Settings to manage your book library.
      </Alert>
    </Container>
  );
}

export default Readarr;
