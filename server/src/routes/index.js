import express from 'express'

const version = process.env.npm_package_version

const router = new express.Router()

router.get('/version', (_req, res) => {
  res.status(200).json(version)
})

export default router