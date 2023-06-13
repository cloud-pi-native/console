import { getClusters } from '@/models/queries/cluster-queries'
import { addReqLogs } from '@/utils/logger'
import { sendNotFound, sendOk } from '@/utils/response'

// GET
export const getAllClustersController = async (req, res) => {
  try {
    const clusters = await getClusters()
    addReqLogs({
      req,
      description: 'Clusters récupérés avec succès',
    })
    sendOk(res, clusters)
  } catch (error) {
    const description = 'Echec de la récupération des clusters'
    addReqLogs({
      req,
      description,
      error,
    })
    sendNotFound(res, description)
  }
}

// // POST
// export const createClusterController = async (req, res) => {
//   const data = req.body

//   try {
//     await organizationSchema.validateAsync(data)

//     const isNameTaken = await getOrganizationByName(data.name)
//     if (isNameTaken) throw new Error('Cette organisation existe déjà')

//     const organization = await createOrganization(data)

//     addReqLogs({
//       req,
//       description: 'Organisation créée avec succès',
//       extras: {
//         organizationId: organization.id,
//       },
//     })
//     sendCreated(res, organization)
//   } catch (error) {
//     const description = 'Echec de la création de l\'organisation'
//     addReqLogs({
//       req,
//       description,
//       error,
//     })
//     sendBadRequest(res, description)
//   }
// }

// // PUT
// export const updateOrganizationController = async (req, res) => {
//   const name = req.params.orgName
//   const { active, label, source } = req.body

//   try {
//     if (active !== undefined) {
//       await updateActiveOrganization({ name, active })
//     }
//     if (label) {
//       await updateLabelOrganization({ name, label, source })
//     }
//     const organization = await getOrganizationByName(name)

//     addReqLogs({
//       req,
//       description: 'Organisation mise à jour avec succès',
//       extras: {
//         organizationId: organization.id,
//       },
//     })
//     sendCreated(res, organization)
//   } catch (error) {
//     const description = 'Echec de la mise à jour de l\'organisation'
//     addReqLogs({
//       req,
//       description,
//       extras: {
//         organizationName: name,
//       },
//       error,
//     })
//     sendBadRequest(res, description)
//   }
// }
