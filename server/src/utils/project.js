import express from 'express'
import {
  getProjectController,
  getProjectsController,
  createProjectController,
} from '../controllers/project.js'

const router = new express.Router()

router.post('/', createProjectController)
router.get('/', getProjectController)
router.get('/:id', getProjectsController)

export default router