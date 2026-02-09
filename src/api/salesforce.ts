/**
 *
 * (c) Copyright Ascensio System SIA 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { httpRequest, type HttpMethod, type HttpResponse } from './http';

const DEFAULT_TIMEOUT = 3000;

export interface SalesforceClientConfig {
  instanceUrl: string;
  accessToken: string;
  version?: string;
  timeout?: number;
}

export interface SalesforceRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  timeout?: number;
  signal?: AbortSignal;
}

export function createSalesforceClient(config: SalesforceClientConfig) {
  const {
    instanceUrl, accessToken, version = 'v59.0', timeout = DEFAULT_TIMEOUT,
  } = config;

  return async <T, TBody = unknown>(
    path: string,
    options: SalesforceRequestOptions<TBody> = {},
  ): Promise<HttpResponse<T>> => {
    const url = `${instanceUrl}/services/data/${version}/${path}`;

    return httpRequest<T, TBody>(url, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: options.body,
      timeout: options.timeout ?? timeout,
      signal: options.signal,
    });
  };
}

export interface SalesforceObject {
  name: string;
  label: string;
  labelPlural: string;
  queryable: boolean;
}

export interface SalesforceField {
  name: string;
  label: string;
  type: string;
  referenceTo?: string[];
  relationshipName?: string;
}

export interface SObjectsResponse {
  sobjects: SalesforceObject[];
}

export interface DescribeResponse {
  fields: SalesforceField[];
}

export interface QueryResponse {
  records: Record<string, unknown>[];
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
}

export interface PaginatedQueryResponse {
  records: Record<string, unknown>[];
  totalSize: number;
  done: boolean;
  next: (() => Promise<PaginatedQueryResponse>) | null;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export function fetchObjects(
  instanceUrl: string,
  accessToken: string,
  options?: RequestOptions,
): Promise<HttpResponse<SObjectsResponse>> {
  return createSalesforceClient({
    instanceUrl,
    accessToken,
    version: 'v59.0',
  })<SObjectsResponse>('sobjects', { signal: options?.signal });
}

export function describeObject(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  options?: RequestOptions,
): Promise<HttpResponse<DescribeResponse>> {
  return createSalesforceClient({
    instanceUrl,
    accessToken,
    version: 'v59.0',
  })<DescribeResponse>(`sobjects/${objectName}/describe`, { signal: options?.signal });
}

function createPaginatedResponse(
  instanceUrl: string,
  accessToken: string,
  data: QueryResponse,
  signal?: AbortSignal,
): PaginatedQueryResponse {
  const {
    records, totalSize, done, nextRecordsUrl,
  } = data;

  return {
    records,
    totalSize,
    done,
    next:
      !done && nextRecordsUrl
        ? async () => {
          const result = await httpRequest<QueryResponse>(
            `${instanceUrl}${nextRecordsUrl}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              timeout: DEFAULT_TIMEOUT,
              signal,
            },
          );

          if (result.error) throw new Error(result.error.message);

          if (!result.data) throw new Error('No data received');

          return createPaginatedResponse(
            instanceUrl,
            accessToken,
            result.data,
            signal,
          );
        }
        : null,
  };
}

export async function executeQuery(
  instanceUrl: string,
  accessToken: string,
  query: string,
  options?: RequestOptions,
): Promise<HttpResponse<PaginatedQueryResponse>> {
  const result = await createSalesforceClient({
    instanceUrl,
    accessToken,
    version: 'v59.0',
  })<QueryResponse>(`query?q=${encodeURIComponent(query)}`, { signal: options?.signal });

  if (result.error || !result.data) return result as HttpResponse<PaginatedQueryResponse>;

  return {
    data: createPaginatedResponse(instanceUrl, accessToken, result.data, options?.signal),
  };
}

export interface SalesforceReport {
  id: string;
  name: string;
  describeUrl: string;
  instancesUrl: string;
  ownerId?: string;
  folderName?: string;
  isPrivate?: boolean;
  lastRunDate?: string;
  lastViewedDate?: string;
}

export type ReportSource = 'all' | 'recent';

export interface ReportFilters {
  source?: ReportSource;
  myReportsOnly?: boolean;
  privateFolderOnly?: boolean;
  groupResults?: boolean;
}

export interface ReportResults {
  factMap: Record<string, {
    rows: {
      dataCells: {
        label: string;
        value: unknown;
      }[];
    }[];
  }>;
  reportMetadata: {
    detailColumns: string[];
  };
  reportExtendedMetadata: {
    detailColumnInfo: Record<
      string,
      {
        label: string;
        dataType: string;
      }
    >;
  };
}

export interface FetchReportsOptions extends RequestOptions {
  filters?: ReportFilters;
  userId?: string;
}

export async function fetchReports(
  instanceUrl: string,
  accessToken: string,
  options?: FetchReportsOptions,
): Promise<HttpResponse<SalesforceReport[]>> {
  const client = createSalesforceClient({ instanceUrl, accessToken, version: 'v59.0' });

  const endpoint = options?.filters?.source === 'recent'
    ? 'analytics/reports?recentlyViewed=true'
    : 'analytics/reports';

  const result = await client<SalesforceReport[]>(endpoint, { signal: options?.signal });

  if (result.error || !result.data) return result;

  let reports = result.data;

  if (options?.filters) {
    const { myReportsOnly, privateFolderOnly } = options.filters;

    if (myReportsOnly && options.userId) reports = reports.filter((r) => r.ownerId === options.userId);

    if (privateFolderOnly) reports = reports.filter((r) => r.isPrivate === true);
  }

  return { data: reports };
}

export function executeReport(
  instanceUrl: string,
  accessToken: string,
  reportId: string,
  options?: RequestOptions,
): Promise<HttpResponse<ReportResults>> {
  return createSalesforceClient({
    instanceUrl,
    accessToken,
    version: 'v59.0',
  })<ReportResults>(`analytics/reports/${reportId}`, { signal: options?.signal });
}

export interface CreateRecordResponse {
  id: string;
  success: boolean;
  errors: { message: string; statusCode: string }[];
}

export interface CompositeRequest {
  method: string;
  url: string;
  referenceId: string;
  body?: Record<string, unknown>;
}

export interface CompositeResponse {
  compositeResponse: {
    body: CreateRecordResponse | { message: string; errorCode: string }[];
    httpStatusCode: number;
    referenceId: string;
  }[];
}

export interface ExportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
}

export function createRecord(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  data: Record<string, unknown>,
  options?: RequestOptions,
): Promise<HttpResponse<CreateRecordResponse>> {
  return createSalesforceClient({
    instanceUrl,
    accessToken,
    version: 'v59.0',
  })<CreateRecordResponse, Record<string, unknown>>(`sobjects/${objectName}`, {
    method: 'POST',
    body: data,
    signal: options?.signal,
  });
}

export function updateRecord(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  recordId: string,
  data: Record<string, unknown>,
  options?: RequestOptions,
): Promise<HttpResponse<void>> {
  return createSalesforceClient({
    instanceUrl,
    accessToken,
    version: 'v59.0',
  })<void, Record<string, unknown>>(`sobjects/${objectName}/${recordId}`, {
    method: 'PATCH',
    body: data,
    signal: options?.signal,
  });
}

export function upsertRecord(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  externalIdField: string,
  externalIdValue: string,
  data: Record<string, unknown>,
  options?: RequestOptions,
): Promise<HttpResponse<CreateRecordResponse>> {
  return createSalesforceClient({
    instanceUrl,
    accessToken,
    version: 'v59.0',
  })<CreateRecordResponse, Record<string, unknown>>(
    `sobjects/${objectName}/${externalIdField}/${externalIdValue}`,
    {
      method: 'PATCH',
      body: data,
      signal: options?.signal,
    },
  );
}

export async function createRecordsBatch(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  records: Record<string, unknown>[],
  options?: RequestOptions,
): Promise<HttpResponse<ExportResult>> {
  const client = createSalesforceClient({ instanceUrl, accessToken, version: 'v59.0' });

  const BATCH_SIZE = 25;
  const results: ExportResult = {
    success: true,
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const compositeRequest: CompositeRequest[] = batch.map((record, idx) => ({
      method: 'POST',
      url: `/services/data/v59.0/sobjects/${objectName}`,
      referenceId: `ref${i + idx}`,
      body: record,
    }));

    const response = await client<CompositeResponse, { compositeRequest: CompositeRequest[] }>(
      'composite',
      {
        method: 'POST',
        body: { compositeRequest },
        signal: options?.signal,
      },
    );

    if (response.error) {
      console.error('Export batch error (create):', response.error);
      results.success = false;
      results.errorCount += batch.length;
      results.errors.push({ row: i, message: response.error.message });
      continue;
    }

    if (response.data) {
      for (const subResponse of response.data.compositeResponse) {
        const rowIndex = parseInt(subResponse.referenceId.replace('ref', ''));

        if (subResponse.httpStatusCode >= 200 && subResponse.httpStatusCode < 300) {
          results.successCount++;
        } else {
          results.success = false;
          results.errorCount++;
          const errorBody = subResponse.body as { message: string; errorCode: string }[];
          const errorMessage = Array.isArray(errorBody)
            ? errorBody.map((e) => e.message).join(', ')
            : 'Unknown error';
          console.error(`Export record error (create, row ${rowIndex + 1}):`, errorMessage, subResponse.body);
          results.errors.push({ row: rowIndex + 1, message: errorMessage });
        }
      }
    }
  }

  return { data: results };
}

export async function updateRecordsBatch(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  records: { id: string; data: Record<string, unknown> }[],
  options?: RequestOptions,
): Promise<HttpResponse<ExportResult>> {
  const client = createSalesforceClient({ instanceUrl, accessToken, version: 'v59.0' });

  const BATCH_SIZE = 25;
  const results: ExportResult = {
    success: true,
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const compositeRequest: CompositeRequest[] = batch.map((record, idx) => ({
      method: 'PATCH',
      url: `/services/data/v59.0/sobjects/${objectName}/${record.id}`,
      referenceId: `ref${i + idx}`,
      body: record.data,
    }));

    const response = await client<CompositeResponse, { compositeRequest: CompositeRequest[] }>(
      'composite',
      {
        method: 'POST',
        body: { compositeRequest },
        signal: options?.signal,
      },
    );

    if (response.error) {
      console.error('Export batch error (update):', response.error);
      results.success = false;
      results.errorCount += batch.length;
      results.errors.push({ row: i, message: response.error.message });
      continue;
    }

    if (response.data) {
      for (const subResponse of response.data.compositeResponse) {
        const rowIndex = parseInt(subResponse.referenceId.replace('ref', ''));

        if (subResponse.httpStatusCode >= 200 && subResponse.httpStatusCode < 300) {
          results.successCount++;
        } else {
          results.success = false;
          results.errorCount++;
          const errorBody = subResponse.body as { message: string; errorCode: string }[];
          const errorMessage = Array.isArray(errorBody)
            ? errorBody.map((e) => e.message).join(', ')
            : 'Unknown error';
          console.error(`Export record error (update, row ${rowIndex + 1}):`, errorMessage, subResponse.body);
          results.errors.push({ row: rowIndex + 1, message: errorMessage });
        }
      }
    }
  }

  return { data: results };
}
