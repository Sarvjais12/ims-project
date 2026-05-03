import mongoose from 'mongoose'

const signalSchema = new mongoose.Schema({
  workItemId: { type: String, required: true, index: true },
  componentId: { type: String, required: true },
  componentType: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, required: true },
  signalNumber: { type: Number, required: true }
})

export const SignalModel = mongoose.model('Signal', signalSchema)