require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Servidor de usuarios corriendo en el puerto ${PORT}`);
});
