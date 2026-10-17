try {
    console.log('Loading express...');
    require('express');
    console.log('Loading cors...');
    require('cors');
    console.log('Loading dotenv...');
    require('dotenv').config();
    console.log('Loading middleware...');
    require('./middleware/requestLogger');
    require('./middleware/errorHandler');
    console.log('Loading routes...');
    require('./routes/userRoutes');
    require('./routes/storageRoutes');
    require('./routes/videoRoutes');
    require('./routes/dressRoutes');
    require('./routes/authRoutes');
    require('./routes/brideRoutes');
    console.log('All modules loaded!');
} catch (e) {
    console.error('FAILED TO LOAD:', e);
}
