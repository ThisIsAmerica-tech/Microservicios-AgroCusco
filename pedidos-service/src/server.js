require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
  console.log(`Servidor de pedidos corriendo en el puerto ${PORT}`);
});
