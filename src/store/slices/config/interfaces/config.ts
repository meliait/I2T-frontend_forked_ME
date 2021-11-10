import { RequestEnhancedState } from '@store/enhancers/requests';
import { BaseState, ID } from '@store/interfaces/store';

// Define a type for the slice state
export interface IConfigState extends RequestEnhancedState {
  app: Config;
  entities: {
    reconciliators: ReconciliatorsState;
    extenders: ExtendersState;
  }
}

export interface ReconciliatorsState extends BaseState<Reconciliator> {}
export interface ExtendersState extends BaseState<Extender> {}

export interface Reconciliator {
  id: ID;
  name: string;
  prefix: string;
  uri: string;
  relativeUrl: string;
  metaToViz: string[];
}

export interface Extender extends Record<string, any> {
  id: ID;
  serviceKey: string;
  name: string;
  relativeUrl: string;
  description: string;
  formParams: ExtenderFormInputParams[];
}

export interface ExtenderFormInputParams {
  id: string;
  description: string;
  label: string;
  inputType: 'text' | 'select' | 'selectColumns' | 'checkbox';
  rules: string[];
  options?: Option[];
  infoText?: string;
  defaultValue?: string;
}

export interface Option {
  id: string;
  value: string;
  label: string;
}

export interface Config {
  APP: AppConfig;
  API: ApiConfig;
}

export interface AppConfig {
  DEMO: boolean;
  MODE: 'standard' | 'challenge';
}

export interface Endpoint {
  path: string;
  useGlobal: boolean;
  name?: string;
}

export interface ApiConfig {
  GLOBAL: string;
  ENDPOINTS: {
    GET_SERVICES_CONFIG: Endpoint;
    GET_DATASET: Endpoint;
    GET_DATASET_INFO: Endpoint;
    GET_TABLES_BY_DATASET: Endpoint;
    GET_TABLE: Endpoint;
    GET_ANNOTATIONS: Endpoint;
    GET_CEA: Endpoint;
    GET_CPA: Endpoint;
    GET_CTA: Endpoint;
    GLOBAL_SEARCH: Endpoint;
    DELETE_DATASET: Endpoint;
    DELETE_TABLE: Endpoint;
    UPLOAD_DATASET: Endpoint;
    SAVE: Endpoint;
    PROCESS_START: Endpoint[];
    EXPORT: Endpoint[];
  }
}
