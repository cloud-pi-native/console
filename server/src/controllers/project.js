import { appLogger, getLogInfos } from '../utils/logger.js'
import {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
} from '../models/project-queries.js'
import { send200, send201, send500 } from '../utils/response.js'
import { ITEM_DELETE_SUCCESS_MESSAGE } from '../utils/messages.js'

export const createItemController = async (req, res) => {
  const data = req.body

  try {
    const item = await createItem(data)

    appLogger.info({
      ...getLogInfos({ itemId: item._id }),
      description: 'Item successfully created',
    })
    send201(res, { item })
  } catch (error) {
    appLogger.error({
      ...getLogInfos(),
      description: 'Cannot create item',
      error,
    })
    send500(res, error.message)
  }
}

export const getItemsController = async (req, res) => {
  try {
    const items = await getItems()

    appLogger.info({
      ...getLogInfos(),
      description: 'Items successfully retrived',
    })
    send200(res, { items })
  } catch (error) {
    appLogger.error({
      ...getLogInfos(),
      description: 'Cannot retrieve items',
      error,
    })
    send500(res, error.message)
  }
}

export const getItemController = async (req, res) => {
  const id = req.params.id

  try {
    const item = await getItemById(id)

    appLogger.info({
      ...getLogInfos({ itemId: item._id }),
      description: 'Item successfully retrived',
    })
    send200(res, { item })
  } catch (error) {
    appLogger.error({
      ...getLogInfos({ itemId: id }),
      description: 'Cannot retrieve item',
      error,
    })
    send500(res, error.message)
  }
}

export const updateItemController = async (req, res) => {
  const id = req.params.id
  const data = req.body

  try {
    const item = await updateItem(id, data)

    appLogger.info({
      ...getLogInfos({ itemId: item._id }),
      description: 'Item successfully updated',
    })
    send200(res, { item })
  } catch (error) {
    appLogger.error({
      ...getLogInfos({ item: data }),
      description: 'Cannot update item',
      error,
    })
    send500(res, error.message)
  }
}

export const deleteItemController = async (req, res) => {
  const id = req.params.id

  try {
    await deleteItem(id)

    appLogger.info({
      ...getLogInfos({ itemId: id }),
      description: 'Item successfully deleted',
    })
    send200(res, ITEM_DELETE_SUCCESS_MESSAGE)
  } catch (error) {
    appLogger.error({
      ...getLogInfos({ itemId: id }),
      description: 'Cannot delete item',
      error,
    })
    send500(res, error.message)
  }
}