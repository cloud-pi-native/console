import express from 'express'
import {
  getProjectByIdController,
  getProjectsController,
  createProjectController,
} from '../controllers/projects.js'

const router = new express.Router()

router.post('/', createProjectController)
router.get('/', getProjectsController)
router.get('/:id', getProjectByIdController)

export default router