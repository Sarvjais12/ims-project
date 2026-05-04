import { WorkItemService } from '../workflow/WorkItemService'
import { WorkItemStatus } from '../workflow/states'
import express, { Request, Response } from 'express'

const router = express.Router()
const service = new WorkItemService()

router.get('/', async (req: Request, res: Response) => {
  try {
    const data = await service.getDashboard()
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await service.getById(req.params.id as string)
    res.json(data)
  } catch (err: any) {
    res.status(404).json({ error: err.message })
  }
})

router.put('/:id/state', async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'status required' })

    const result = await service.transition(req.params.id as string, status as WorkItemStatus)
    res.json(result)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/:id/rca', async (req: Request, res: Response) => {
  try {
    const result = await service.submitRca(req.params.id as string , req.body)
    res.json(result)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router