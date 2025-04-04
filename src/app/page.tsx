'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  TextField,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  CardActionArea,
  Rating,
  Skeleton,
  Alert,
  Chip,
  Stack,
  Divider,
  OutlinedInput,
  IconButton,
  Grid,
} from '@mui/material';
import LocationOn from '@mui/icons-material/LocationOn';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Favorite from '@mui/icons-material/Favorite';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Group from '@mui/icons-material/Group';
import LocalActivity from '@mui/icons-material/LocalActivity';

interface Yard {
  id: number;
  title: string;
  city: string;
  price: number;
  guests: number;
  image: string;
  amenities: string[];
  rating?: number;
  description: string;
  reviews: number;
  nearbyAttractions: string[];
}

const AMENITY_OPTIONS = [
  { value: 'pool', label: 'Pool' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'parking', label: 'Parking' },
  { value: 'restroom', label: 'Restroom' },
  { value: 'shade', label: 'Shade' },
  { value: 'seating', label: 'Seating' },
  { value: 'lighting', label: 'Lighting' },
];

const GUEST_OPTIONS = [
  { value: '5', label: 'Up to 5 guests' },
  { value: '10', label: 'Up to 10 guests' },
  { value: '15', label: 'Up to 15 guests' },
  { value: '20', label: 'Up to 20 guests' },
];

export default function Home() {
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [city, setCity] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [yards, setYards] = useState<Yard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchYards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the current hostname for API requests
      const apiUrl = `${window.location.origin}/api/yards`;
      
      console.log('Fetching yards from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (data.error) {
        console.error('API error:', data.error);
        setError(data.error);
        setYards([]);
      } else {
        setYards(data.yards || []);
      }
    } catch (error) {
      console.error('Error fetching yards:', error);
      setError('Failed to fetch yards. Please try again later.');
      setYards([]);
    } finally {
      setLoading(false);
    }
  };

  // Add a new function for filtering yards
  const filterYards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use absolute URL in production
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://goyardly.com/api/yards' 
        : '/api/yards';
      
      // Prepare filter parameters
      const filterParams = {
        city: city || undefined,
        guests: selectedGuests.length > 0 ? selectedGuests[0] : undefined,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined
      };
      
      console.log('Filtering yards with params:', filterParams);
      
      // Only make a POST request if we have filters
      if (filterParams.city || filterParams.guests || filterParams.amenities) {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
          body: JSON.stringify(filterParams),
        });
        
        console.log('Filter response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received filtered data:', data);
        
        if (data.error) {
          console.error('API error:', data.error);
          setError(data.error);
          setYards([]);
        } else {
          setYards(data.yards || []);
        }
      } else {
        // If no filters, just fetch all yards
        fetchYards();
      }
    } catch (error) {
      console.error('Error filtering yards:', error);
      setError('Failed to filter yards. Please try again later.');
      setYards([]);
    } finally {
      setLoading(false);
    }
  };

  // Add a retry mechanism for initial load
  useEffect(() => {
    const loadYards = async () => {
      try {
        await fetchYards();
      } catch (error) {
        console.error('Initial fetch failed, retrying in 2 seconds...');
        setTimeout(async () => {
          try {
            await fetchYards();
          } catch (retryError) {
            console.error('Retry also failed:', retryError);
          }
        }, 2000);
      }
    };
    
    loadYards();
  }, []);

  // Update the filter handlers to use the new filterYards function
  const handleGuestChange = (event: any) => {
    setSelectedGuests(event.target.value);
    filterYards();
  };

  const handleAmenityChange = (event: any) => {
    setSelectedAmenities(event.target.value);
    filterYards();
  };

  const handleCityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCity(event.target.value);
    // Don't filter immediately on every keystroke, use debounce or call filterYards on blur
  };

  const handleCityBlur = () => {
    filterYards();
  };

  // Remove the client-side filtering since we're now using the API
  const filteredYards = yards;

  // Load favorites when user is authenticated or when page loads
  useEffect(() => {
    const loadFavorites = async () => {
      if (status === 'authenticated') {
        try {
          const response = await fetch('/api/favorites', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store', // Prevent caching to ensure fresh data
          });
          
          if (response.ok) {
            const data = await response.json();
            setFavorites(data.yards.map((yard: Yard) => yard.id));
          }
        } catch (error) {
          console.error('Error loading favorites:', error);
        } finally {
          setIsLoadingFavorites(false);
        }
      } else {
        setIsLoadingFavorites(false);
      }
    };

    loadFavorites();
  }, [status]); // Re-run when auth status changes

  const toggleFavorite = async (yardId: number) => {
    if (status !== 'authenticated') {
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yardId }),
      });

      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleYardClick = (yardId: number) => {
    router.push(`/yards/${yardId}`);
  };

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading yards...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar position="static" sx={{ bgcolor: '#3A7D44' }}>
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ 
              flexGrow: 1,
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8,
              },
            }}
            onClick={() => router.push('/')}
          >
            Yardly
          </Typography>
          {/* ... rest of the AppBar content ... */}
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: '#3A7D44',
          color: 'white',
          py: { xs: 4, md: 8 },
          px: { xs: 2, md: 4 },
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: '25vh', sm: '30vh', md: '60vh' },
          position: 'relative',
        }}
      >
        <Container 
          maxWidth="md"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 2, md: 4 },
            py: { xs: 2, md: 4 },
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '3rem' },
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
              color: 'white',
              maxWidth: '100%',
              overflow: 'visible',
              textOverflow: 'clip',
              mb: { xs: 1, md: 2 },
            }}
          >
            Your party, their yard
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/about')}
            sx={{
              bgcolor: 'white',
              color: '#3A7D44',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
              },
              px: { xs: 4, md: 6 },
              py: { xs: 1, md: 2 },
              fontSize: { xs: '1rem', md: '1.2rem' },
              fontWeight: 'bold',
              borderRadius: '50px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            Discover How It Works
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Search Section */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            label="Search by city"
            value={city}
            onChange={handleCityChange}
            onBlur={handleCityBlur}
            sx={{ mb: 2 }}
          />
          
          {/* Guest Limit Dropdown */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Guest Limit</InputLabel>
            <Select
              multiple
              value={selectedGuests}
              onChange={handleGuestChange}
              input={<OutlinedInput label="Guest Limit" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={GUEST_OPTIONS.find(opt => opt.value === value)?.label}
                      sx={{ bgcolor: '#3A7D44', color: 'white' }}
                    />
                  ))}
                </Box>
              )}
            >
              {GUEST_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Amenities Dropdown */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Amenities</InputLabel>
            <Select
              multiple
              value={selectedAmenities}
              onChange={handleAmenityChange}
              input={<OutlinedInput label="Amenities" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={AMENITY_OPTIONS.find(opt => opt.value === value)?.label}
                      sx={{ bgcolor: '#3A7D44', color: 'white' }}
                    />
                  ))}
                </Box>
              )}
            >
              {AMENITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Featured Yards Section */}
        <Typography 
          variant="h4" 
          component="h2" 
          sx={{ 
            mb: 3, 
            color: '#3A7D44',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          Featured Yards
        </Typography>

        {/* Yard Listings */}
        <Grid container spacing={4}>
          {loading ? (
            // Loading state
            Array.from({ length: 3 }).map((_, index) => (
              <Grid item key={index} xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Skeleton variant="rectangular" height={200} />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" height={32} />
                    <Skeleton variant="text" height={24} />
                    <Skeleton variant="text" height={24} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : error ? (
            // Error state
            <Grid item xs={12}>
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            </Grid>
          ) : filteredYards.length === 0 ? (
            // Empty state
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 2 }}>
                No yards found. Try adjusting your search filters.
              </Alert>
            </Grid>
          ) : (
            // Success state
            filteredYards.map((yard) => (
              <Grid item key={yard.id} xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      transition: 'transform 0.2s ease-in-out',
                      boxShadow: 3
                    }
                  }}
                >
                  <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(yard.id);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        bgcolor: 'rgba(255, 255, 255, 0.8)',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                        },
                        zIndex: 3,
                      }}
                    >
                      {favorites.includes(yard.id) ? (
                        <Favorite sx={{ color: '#3A7D44' }} />
                      ) : (
                        <FavoriteBorder sx={{ color: '#3A7D44' }} />
                      )}
                    </IconButton>
                    <CardMedia
                      component="img"
                      height="200"
                      image={yard.image}
                      alt={yard.title}
                    />
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box>
                        <Typography gutterBottom variant="h6" component="h2">
                          {yard.title}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          <Chip 
                            label={`Up to ${yard.guests} guests`}
                            size="small"
                            sx={{ bgcolor: '#FFD166', color: '#3A7D44' }}
                          />
                          {yard.amenities.slice(0, 3).map((amenity) => (
                            <Chip
                              key={amenity}
                              label={amenity}
                              size="small"
                              sx={{ bgcolor: 'rgba(58, 125, 68, 0.1)', color: '#3A7D44' }}
                            />
                          ))}
                          {yard.amenities.length > 3 && (
                            <Chip
                              label={`+${yard.amenities.length - 3} more`}
                              size="small"
                              sx={{ bgcolor: 'rgba(58, 125, 68, 0.1)', color: '#3A7D44' }}
                            />
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ mt: 'auto' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {yard.city}
                        </Typography>
                        <Typography variant="h6" color="primary" gutterBottom>
                          ${yard.price}/hour
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/yards/${yard.id}/book`);
                          }}
                          sx={{
                            bgcolor: '#3A7D44',
                            '&:hover': {
                              bgcolor: '#2D5F35',
                            },
                          }}
                        >
                          Book Now
                        </Button>
                      </Box>
                    </CardContent>
                  </Box>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Container>
    </Box>
  );
} 