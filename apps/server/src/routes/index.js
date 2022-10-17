import express from 'express'
import projectsRouter from './project.js'

const version = process.env.npm_package_version

const router = new express.Router()

router.use('/projects', projectsRouter)

router.get('/version', (_req, res) => {
  res.status(200).json(version)
})

export default router