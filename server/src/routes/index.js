import express from 'express'

const router = new express.Router()

router.get('/version', (_req, res) => {
  res.status(200).json(pkg.version)
})

export default router