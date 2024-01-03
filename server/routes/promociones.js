import express from 'express';
import Promociones from '../models/promociones.js'; // Asegúrate de que la ruta y la extensión del archivo sean correctas
import Cupones from '../models/cupones.js';
import { io } from '../../server.js';
const router = express.Router();

router.delete('/eliminar-promocion/:codigo', async (req, res) => {
  try {
    const codigoPromocion = req.params.codigo;

    // Busca y elimina la promoción por su código
    const eliminada = await Promociones.findOneAndDelete({ codigo: codigoPromocion });

    if (eliminada) {
      // Ahora, elimina todos los cupones relacionados con la promoción eliminada
      await Cupones.deleteMany({ codigoPromocion: codigoPromocion });
      io.emit('cPromotions', {
        onAction: 'delete',
        info: eliminada,
      });
      res.status(200).json(eliminada);
    } else {
      res.status(404).json({ mensaje: 'Promoción no encontrada' });
    }
  } catch (error) {
    console.error('Error al eliminar la promoción:', error);
    res.status(500).json({ mensaje: 'Error al eliminar la promoción' });
  }
});

router.post('/add-promocion', async (req, res) => {
  try {
    const { prenda, cantidadMin, tipo, descripcion, descuento } = req.body;

    if (!prenda || !cantidadMin || !tipo || !descripcion || !descuento) {
      return res.status(400).json({ mensaje: 'Todos los campos son requeridos.' });
    }

    const codigoPromocion = await generarCodigoPromocionUnico();

    const nuevaPromoción = new Promociones({
      codigo: codigoPromocion,
      prenda,
      cantidadMin,
      tipo,
      descripcion,
      descuento,
    });

    const promociónGuardada = await nuevaPromoción.save();
    io.emit('cPromotions', {
      onAction: 'add',
      info: promociónGuardada,
    });
    res.status(201).json(promociónGuardada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar promoción' });
  }
});

async function generarCodigoPromocionUnico() {
  let numero = 1;
  while (true) {
    const codigoPromocion = `PROM${numero.toString().padStart(4, '0')}`;
    const codigoDuplicado = await Promociones.findOne({ codigo: codigoPromocion });
    if (!codigoDuplicado) {
      return codigoPromocion;
    }
    numero++;
  }
}

router.get('/get-promociones', (req, res) => {
  Promociones.find()
    .then((promos) => {
      res.json(promos);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});
export default router;
