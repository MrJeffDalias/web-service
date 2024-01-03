import mongoose from 'mongoose';

const PromocionesSchema = new mongoose.Schema(
  {
    codigo: String,
    prenda: String,
    cantidadMin: Number,
    tipo: String,
    descripcion: String,
    descuento: Number,
  },
  { collection: 'Promocion' }
);

const Promocion = mongoose.model('Promocion', PromocionesSchema);

export default Promocion;
