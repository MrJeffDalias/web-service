import express from 'express';
import CuadreDiario from '../models/cuadreDiario.js';
import Factura from '../models/Factura.js';
import Delivery from '../models/delivery.js';
import Gasto from '../models/gastos.js';
import Usuario from '../models/usuarios/usuarios.js';
import moment from 'moment';

import { openingHours } from '../middleware/middleware.js';
const router = express.Router();

const handleGetInfoUser = async (id) => {
  const iUser = await Usuario.findById(id).lean();

  return { _id: iUser._id, name: iUser.name, usuario: iUser.usuario, rol: iUser.rol };
};

router.post('/save-cuadre', openingHours, async (req, res) => {
  const { infoCuadre, orders, deliverys, gastos } = req.body;

  try {
    // Obtén el valor máximo actual de 'index' en tus documentos
    const maxIndex = await CuadreDiario.findOne({}, { index: 1 }, { sort: { index: -1 } });

    // Calcula el nuevo valor de 'index'
    const newIndex = maxIndex ? maxIndex.index + 1 : 1;

    // Crea un nuevo cuadre con el nuevo valor de 'index'
    const newCuadre = new CuadreDiario({ ...infoCuadre, index: newIndex });

    // Guarda el nuevo cuadre en la base de datos
    const cuadreSavedDocument = await newCuadre.save();
    const cuadreSaved = cuadreSavedDocument.toObject();

    // Actualiza los documentos de Factura en paralelo
    await Promise.all(
      orders.map(async (order) => {
        const { idOrder, idsPago } = order;

        // Encuentra el documento en la colección Factura donde _id coincide con idOrder
        const facturaToUpdate = await Factura.findOne({ _id: idOrder });

        if (facturaToUpdate) {
          // Actualiza ListPago utilizando map para crear un nuevo array
          facturaToUpdate.ListPago = facturaToUpdate.ListPago.map((pago) => {
            if (idsPago.includes(pago._id.toString())) {
              pago.idCuadre = cuadreSaved._id;
            }
            return pago;
          });

          // Guarda los cambios en el documento de Factura
          await facturaToUpdate.save();
        }
      })
    );

    // Agrega la asignación de idCuadre para Gastos
    await Promise.all(
      gastos.map(async (idGasto) => {
        await Gasto.findByIdAndUpdate(idGasto, { idCuadre: cuadreSaved._id }, { new: true });
      })
    );

    // Agrega la asignación de idCuadre para Deliverys
    await Promise.all(
      deliverys.map(async (idDelivery) => {
        await Delivery.findByIdAndUpdate(idDelivery, { idCuadre: cuadreSaved._id }, { new: true });
      })
    );

    // res.json({ ...cuadreSaved, infoUser: await handleGetInfoUser(cuadreSaved.userID), userID: undefined });
    res.json('Guardado Exitoso');
  } catch (error) {
    console.error('Error al Guardar Delivery:', error);
    res.status(500).json({ mensaje: 'Error al Guardar Delivery' });
  }
});

router.put('/update-cuadre/:id', openingHours, async (req, res) => {
  const { id } = req.params;
  const { infoCuadre, orders, deliverys, gastos } = req.body;

  try {
    // Actualiza el cuadre en la colección CuadreDiario
    const cuadreUpdate = await CuadreDiario.findByIdAndUpdate(id, infoCuadre, { new: true }).lean();

    if (!cuadreUpdate) {
      return res.status(404).json({ mensaje: 'Cuadre no encontrado' });
    }

    // Actualiza los documentos de Factura en paralelo
    await Promise.all(
      orders.map(async (order) => {
        const { idOrder, idsPago } = order;

        // Encuentra el documento en la colección Factura donde _id coincide con idOrder
        const facturaToUpdate = await Factura.findOne({ _id: idOrder });

        if (facturaToUpdate) {
          // Actualiza ListPago utilizando map para crear un nuevo array
          facturaToUpdate.ListPago = facturaToUpdate.ListPago.map((pago) => {
            if (idsPago.includes(pago._id.toString())) {
              pago.idCuadre = cuadreUpdate._id; // Usar cuadreUpdate._id
            }
            return pago;
          });

          // Guarda los cambios en el documento de Factura
          await facturaToUpdate.save();
        }
      })
    );

    await Promise.all(
      gastos.map(async (idGasto) => {
        await Gasto.findByIdAndUpdate(idGasto, { idCuadre: cuadreUpdate._id });
      })
    );

    await Promise.all(
      deliverys.map(async (idDelivery) => {
        await Delivery.findByIdAndUpdate(idDelivery, { idCuadre: cuadreUpdate._id });
      })
    );

    // res.json({ ...cuadreUpdate, infoUser: await handleGetInfoUser(cuadreUpdate.userID), userID: undefined });
    res.json('Actualizacion Exitosa');
  } catch (error) {
    console.error('Error al actualizar el cuadre:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el cuadre' });
  }
});

router.get('/get-cuadre/date/:dateCuadre', async (req, res) => {
  const { dateCuadre } = req.params;

  try {
    const infoCuadres = await CuadreDiario.findOne({ dateCuadres: dateCuadre }).lean();

    if (!infoCuadres) {
      return res.json(null);
    }

    // Enrich 'listCuadres' with specific user information and remove 'userID'
    const newListCuadres = await Promise.all(
      infoCuadres.listCuadres.map(async (cuadre) => {
        try {
          const userInfo = await Usuario.findById(cuadre.userID);
          const { _id, name, usuario } = userInfo;
          return { ...cuadre, userInfo: { _id, name, usuario } };
        } catch (error) {
          console.error('Error al obtener información del usuario:', error);
          return cuadre;
        }
      })
    );

    infoCuadres.listCuadres = newListCuadres.map(({ userID, ...cuadre }) => cuadre);

    res.json(infoCuadres);
  } catch (error) {
    console.error('Error al obtener el dato:', error);
    res.status(500).json({ mensaje: 'Error al obtener el dato' });
  }
});

router.get('/get-cuadre/last', async (req, res) => {
  try {
    // 2. Encontrar el último cuadre de toda la colección.
    let lastCuadre = await CuadreDiario.findOne().sort({ index: -1 }).lean();

    if (lastCuadre) {
      res.json({
        ...lastCuadre,
        infoUser: await handleGetInfoUser(lastCuadre.userID),
        userID: undefined,
        type: 'update',
        enable: false,
        saved: true,
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el cuadre.' });
  }
});

router.get('/get-cuadre/:idUsuario/:datePrincipal', async (req, res) => {
  try {
    const { idUsuario, datePrincipal } = req.params;

    // 1. Buscar por la fecha dada.
    let listCuadres = await CuadreDiario.find({ 'date.fecha': datePrincipal }).lean();

    // 2. Encontrar el último cuadre de toda la colección.
    let lastCuadre = await CuadreDiario.findOne().sort({ index: -1 }).lean();

    // 3. Enriquecer el último cuadre con la información del usuario.
    if (lastCuadre) {
      const iUser = await handleGetInfoUser(lastCuadre.userID);
      lastCuadre = {
        ...lastCuadre,
        infoUser: iUser,
        userID: undefined,
      };
    }

    // 4. Enriquecer cada elemento de listCuadres con la información del usuario.
    if (listCuadres.length > 0) {
      const userInfos = await Promise.all(
        listCuadres.map(async (cuadre) => {
          const userInfo = await handleGetInfoUser(cuadre.userID);
          return userInfo;
        })
      );

      listCuadres = listCuadres.map((cuadre, index) => {
        const iUser = userInfos[index];
        return { ...cuadre, infoUser: iUser, userID: undefined };
      });
    }

    // 5. Agregar atributo 'enable' a cada elemento de listCuadres.
    if (listCuadres.length > 0 && lastCuadre) {
      const dPrincipal = moment(datePrincipal, 'YYYY-MM-DD');
      const dLastCuadre = moment(lastCuadre.date.fecha, 'YYYY-MM-DD');
      listCuadres = listCuadres.map((elemento) => {
        if (
          dPrincipal.isSame(dLastCuadre) &&
          elemento._id === lastCuadre._id &&
          elemento.infoUser._id === lastCuadre.infoUser._id
        ) {
          return { ...elemento, type: 'update', enable: false, saved: true };
        } else {
          return { ...elemento, type: 'view', enable: true, saved: true };
        }
      });
    }

    const infoBase = {
      date: {
        fecha: datePrincipal,
        hora: '',
      },
      cajaInicial: 0,
      Montos: [],
      totalCaja: '',
      estado: '',
      margenError: '',
      corte: 0,
      cajaFinal: 0,
      ingresos: {
        efectivo: '',
        transferencia: '',
        tarjeta: '',
      },
      egresos: {
        gastos: '',
        delivery: '',
      },
      notas: [],
      infoUser: await handleGetInfoUser(idUsuario),
    };

    let cuadreActual = infoBase;

    if (lastCuadre) {
      const dPrincipal = moment(datePrincipal, 'YYYY-MM-DD');
      const dLastCuadre = moment(lastCuadre.date.fecha, 'YYYY-MM-DD');
      if (listCuadres.length > 0) {
        if (dPrincipal.isSame(dLastCuadre)) {
          if (idUsuario === lastCuadre.infoUser._id.toString()) {
            cuadreActual = { ...lastCuadre, type: 'update', enable: false, saved: true };
          } else {
            cuadreActual = {
              ...cuadreActual,
              cajaInicial: lastCuadre.cajaFinal,
              type: 'new',
              enable: false,
              saved: false,
            };
          }
        } else {
          if (dPrincipal.isBefore(dLastCuadre)) {
            // <
            cuadreActual = { ...listCuadres[listCuadres.length - 1], type: 'view', enable: true, saved: true };
          }
        }
      } else {
        if (dPrincipal.isAfter(dLastCuadre)) {
          // >
          cuadreActual = {
            ...cuadreActual,
            cajaInicial: lastCuadre.cajaFinal,
            type: 'new',
            enable: false,
            saved: false,
          };
        }
        if (dPrincipal.isBefore(dLastCuadre)) {
          // <
          cuadreActual = { ...cuadreActual, type: 'view', enable: true, saved: false };
        }
      }
    }

    res.json({
      listCuadres: listCuadres ? listCuadres : [],
      lastCuadre: lastCuadre ? { ...lastCuadre, type: 'update', enable: false, saved: true } : null,
      cuadreActual: cuadreActual,
      infoBase,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor: ' + error.message);
  }
});

export default router;
