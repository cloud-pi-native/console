import express from 'express'
import {
  getProjectController,
  getProjectsController,
  createProjectController,
  updateProjectController,
  deleteProjectController,
} from '../controllers/project-controllers.js'

const router = new express.Router()

router.post('/', createProjectController)
router.get('/', getProjectController)
router.get('/:id', getProjectsController)
router.put('/:id', updateProjectController)
router.delete('/:id', deleteProjectController)

export default router