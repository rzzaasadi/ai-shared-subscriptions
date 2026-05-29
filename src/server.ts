import express from 'express';

const app = express();

app.use(express.json());

app.get('/', (_, res) => {
  res.send('🚀 AI Shared Backend Running');
});

app.listen(3000, () => {
  console.log('🌐 Server running on port 3000');
});