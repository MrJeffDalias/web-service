import express from 'express';
import Prendas from '../models/prendas.js';
import { io } from '../../server.js';
const router = express.Router();

router.put('/update-prendas', (req, res) => {
  const nuevasPrendas = req.body.prendas; // Datos nuevos que llegan en la solicitud

  Prendas.findOneAndUpdate({}, { prendas: nuevasPrendas }, { new: true })
    .then((updatedPrendas) => {
      if (updatedPrendas) {
        io.emit('cPricePrendas', updatedPrendas.prendas);
        res.json(updatedPrendas.prendas);
      } else {
        res.status(404).json({ mensaje: 'Prendas no encontradas' });
      }
    })
    .catch((error) => {
      console.error('Error al actualizar los datos:', error);
      res.status(500).json({ mensaje: 'Error al actualizar los datos' });
    });
});

router.get('/get-prendas', (req, res) => {
  Prendas.findOne() // Intenta encontrar un registro existente
    .then((infoPrendas) => {
      if (infoPrendas) {
        res.json(infoPrendas.prendas);
      } else {
        // Si no existe, crea un nuevo registro con las prendas por defecto
        const prendasPorDefecto = [
          {
            name: 'Delivery',
            price: '4.5',
          },
          {
            name: 'Edredon',
            price: '10',
          },
          {
            name: 'Ropa x Kilo',
            price: '5.8',
          },
          {
            name: 'Cobertor',
            price: '19',
          },
          {
            name: 'Cubrecama',
            price: '14',
          },
          {
            name: 'Frazada',
            price: '18',
          },
          {
            name: 'Manta',
            price: '12',
          },
          {
            name: 'Casaca',
            price: '8',
          },
          {
            name: 'Terno',
            price: '15',
          },
          {
            name: 'Saco',
            price: '10',
          },
          {
            name: 'Camisa',
            price: '5',
          },
          {
            name: 'Pantalon',
            price: '4',
          },
          {
            name: 'Abrigo',
            price: '100',
          },
          {
            name: 'Zapatillas',
            price: '9',
          },
          {
            name: 'Jean',
            price: '4',
          },
          {
            name: 'Polo',
            price: '4',
          },
          {
            name: 'Alfombra',
            price: '25',
          },
          {
            name: 'Cortinas',
            price: '5',
          },
          {
            name: 'Almohada',
            price: '8',
          },
          {
            name: 'Tapete',
            price: '10',
          },
        ];

        Prendas.create({ prendas: prendasPorDefecto })
          .then((nuevasPrendas) => {
            res.json(nuevasPrendas.prendas);
          })
          .catch((error) => {
            console.error('Error al crear las nuevas prendas:', error);
            res.status(500).json({ mensaje: 'Error al crear las nuevas prendas' });
          });
      }
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

export default router;
