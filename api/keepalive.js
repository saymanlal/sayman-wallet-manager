export default async function handler(req, res) {
    try {
      // Ping main blockchain
      const response = await fetch('https://sayman.onrender.com/health');
      const data = await response.json();
      
      console.log('Keep-alive ping:', new Date().toISOString(), data);
      
      res.status(200).json({
        success: true,
        timestamp: Date.now(),
        blockchain: data
      });
    } catch (error) {
      console.error('Keep-alive error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }