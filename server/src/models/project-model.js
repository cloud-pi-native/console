import mongoose from 'mongoose'

const { Schema } = mongoose

const ProjectSchema = new Schema({
  _id: {
  type: String,
  required: true,
  trim: true,
  },
  email: {
    type: String,
  },
  orgName: {
    type: String,
  },
  projectName: {
    type: String,
  },
  services: {
    type: Array,
    enum: [
      'argocd',
      'gitlab',
      'nexus',
      'quay',
      'sonarqube',
      'vault'
    ],
  },
  repo: {
    type: Array,
    ref: 'Repository',
  },
})

ProjectSchema.set('toObject', {
  transform (_doc, ret /*, opt */) {
    delete ret.__v
    return ret
  },
})

function setOptions () {
  this.setOptions({ runValidators: true, new: true })
}

mongoose.plugin(schema => {
  schema.pre('findOneAndUpdate', setOptions)
  schema.pre('updateMany', setOptions)
})

const projectName = 'projects'

export default mongoose.model('Project', ProjectSchema, projectName)