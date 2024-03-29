const createOrganizationDto = {
  source: {
    type: 'string',
  },
  name: {
    type: 'string',
  },
  label: {
    type: 'string',
  },
} as const

export const organizationOpenApiSchema = {
  $id: 'organization',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    ...createOrganizationDto,
    active: {
      type: 'boolean',
    },
    createdAt: {
      type: 'string',
    },
    updatedAt: {
      type: 'string',
    },
  },
} as const

const organizationParamsSchema = {
  type: 'object',
  properties: {
    orgName: {
      type: 'string',
    },
  },
  required: ['orgName'],
} as const

export const getActiveOrganizationsSchema = {
  description: 'Retrieve active organizations',
  tags: ['organization'],
  summary: 'Retrieve active organizations',
  response: {
    200: {
      type: 'array',
      items: { $ref: 'organization#' },
    },
  },
} as const

export const getAllOrganizationsSchema = {
  description: 'Retrieve all organizations',
  tags: ['organization'],
  summary: 'Retrieve all organizations, admin only',
  response: {
    200: {
      type: 'array',
      items: { $ref: 'organization#' },
    },
  },
} as const

export const fetchOrganizationsSchema = {
  description: 'Update an organization',
  tags: ['organization'],
  summary: 'Update an organization',
  response: {
    200: {
      type: 'array',
      items: { $ref: 'organization#' },
    },
  },
} as const

export const createOrganizationSchema = {
  description: 'Create a new organization',
  tags: ['organization'],
  summary: 'Create a new organization',
  body: {
    type: 'object',
    properties: createOrganizationDto,
    required: ['source', 'name', 'label'],
    additionalProperties: false,
    // required: Object.keys(createOrganizationDto),
  },
  response: {
    201: { $ref: 'organization#' },
  },
} as const

export const updateOrganizationSchema = {
  description: 'Update an organization',
  tags: ['organization'],
  summary: 'Update an organization',
  params: organizationParamsSchema,
  body: {
    type: 'object',
    properties: {
      label: createOrganizationDto.label,
      source: createOrganizationDto.source,
      active: organizationOpenApiSchema.properties.active,
    },
  },
  response: {
    200: { $ref: 'organization#' },
  },
} as const
