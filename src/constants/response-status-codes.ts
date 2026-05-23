/**
 * Response status codes — Layer 1 constant.
 * ResponseStatus is the coarse SUCCESS/ERROR flag; ResponseClass groups
 * responses by the area of the service that produced them.
 */

export enum ResponseStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum ResponseClass {
  SERVICE_STATUS = 'Service Status',
  REQUEST_EXECUTE = 'Request Execute',
  EXTRACTION = 'Extraction',
  VALIDATION = 'Validation',
  SAFETY = 'Safety',
}
