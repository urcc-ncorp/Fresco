import { queue } from 'async';
import { XCircle } from 'lucide-react';
import { hash } from 'ohash';
import { useCallback, useReducer, useRef } from 'react';
import { insertProtocol } from '~/actions/protocols';
import { ErrorDetails } from '~/components/ErrorDetails';
import Link from '~/components/Link';
import {
  jobInitialState,
  jobReducer,
} from '~/components/ProtocolImport/JobReducer';
import { AlertDialogDescription } from '~/components/ui/AlertDialog';
import { APP_SUPPORTED_SCHEMA_VERSIONS } from '~/fresco.config';
import { getExistingAssetIds, getProtocolByHash } from '~/queries/protocols';
import { type AssetInsertType } from '~/schemas/protocol';
import { DatabaseError } from '~/utils/databaseError';
import { ensureError } from '~/utils/ensureError';
import { formatNumberList } from '~/utils/general';
import {
  fileAsArrayBuffer,
  getProtocolAssets,
  getProtocolJson,
} from '~/utils/protocolImport';

// Utility helper for adding artificial delay to async functions
// const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useProtocolImport = () => {
  const [jobs, dispatch] = useReducer(jobReducer, jobInitialState);

  /**
   * This is the main job processing function. Takes a file, and handles all
   * the steps required to import it into the database, updating the job
   * status as it goes.
   */
  const processJob = async (file: File) => {
    try {
      const fileName = file.name;

      dispatch({
        type: 'UPDATE_STATUS',
        payload: {
          id: fileName,
          status: 'Extracting protocol',
        },
      });

      const fileArrayBuffer = await fileAsArrayBuffer(file);

      // TODO: check if this causes multiple fetches by importing again for each job.
      const JSZip = (await import('jszip')).default; // Dynamic import to reduce bundle size
      const zip = await JSZip.loadAsync(fileArrayBuffer);
      const protocolJson = await getProtocolJson(zip);

      // Validating protocol...
      dispatch({
        type: 'UPDATE_STATUS',
        payload: {
          id: fileName,
          status: 'Validating protocol',
        },
      });

      // Check if the protocol version is compatible with the app.
      const protocolVersion = protocolJson.schemaVersion;
      if (!APP_SUPPORTED_SCHEMA_VERSIONS.includes(protocolVersion)) {
        dispatch({
          type: 'UPDATE_ERROR',
          payload: {
            id: fileName,
            rawError: new Error('Protocol version not supported'),
            error: {
              title: 'Protocol version not supported',
              description: (
                <AlertDialogDescription>
                  The protocol you uploaded is not compatible with this version
                  of the app. Fresco supports protocols using version number
                  {APP_SUPPORTED_SCHEMA_VERSIONS.length > 1 ? 's' : ''}{' '}
                  {formatNumberList(APP_SUPPORTED_SCHEMA_VERSIONS)}.
                </AlertDialogDescription>
              ),
            },
          },
        });

        return;
      }

      const { validateProtocol } = await import('@codaco/protocol-validation');

      const validationResult = await validateProtocol(protocolJson);

      if (!validationResult.isValid) {
        const resultAsString = JSON.stringify(validationResult, null, 2);

        dispatch({
          type: 'UPDATE_ERROR',
          payload: {
            id: fileName,
            rawError: new Error('Protocol validation failed', {
              cause: validationResult,
            }),
            error: {
              title: 'The protocol is invalid!',
              description: (
                <>
                  <AlertDialogDescription>
                    The protocol you uploaded is invalid. See the details below
                    for specific validation errors that were found.
                  </AlertDialogDescription>
                  <AlertDialogDescription>
                    If you believe that your protocol should be valid please ask
                    for help via our{' '}
                    <Link
                      href="https://community.networkcanvas.com"
                      target="_blank"
                    >
                      community forum
                    </Link>
                    .
                  </AlertDialogDescription>
                </>
              ),
              additionalContent: (
                <ErrorDetails errorText={resultAsString}>
                  <ul className="max-w-md list-inside space-y-2">
                    {[
                      ...validationResult.schemaErrors,
                      ...validationResult.logicErrors,
                    ].map((validationError, i) => (
                      <li className="flex capitalize" key={i}>
                        <XCircle className="text-destructive mr-2 h-4 w-4" />
                        <span>
                          {validationError.message}{' '}
                          <span className="text-xs italic">
                            ({validationError.path})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </ErrorDetails>
              ),
            },
          },
        });

        return;
      }

      // After this point, assume the protocol is valid.

      // Check if the protocol already exists in the database
      const protocolHash = hash(protocolJson);
      const exists = await getProtocolByHash(protocolHash);
      if (exists) {
        dispatch({
          type: 'UPDATE_ERROR',
          payload: {
            id: file.name,
            rawError: new Error('Protocol already exists'),
            error: {
              title: 'Protocol already exists',
              description: (
                <AlertDialogDescription>
                  The protocol you attempted to import already exists in the
                  database. Delete the existing protocol first before attempting
                  to import it again.
                </AlertDialogDescription>
              ),
            },
          },
        });

        return;
      }

      const assets = await getProtocolAssets(protocolJson, zip);

      const newAssets: typeof assets = [];

      const existingAssetIds: string[] = [];

      let newAssetsWithCombinedMetadata: AssetInsertType = [];

      // Check if the assets are already in the database.
      // If yes, add them to existingAssetIds to be connected to the protocol.
      // If not, add them to newAssets to be uploaded.

      try {
        const newAssetIds = await getExistingAssetIds(
          assets.map((asset) => asset.assetId),
        );

        assets.forEach((asset) => {
          if (newAssetIds.includes(asset.assetId)) {
            newAssets.push(asset);
          } else {
            existingAssetIds.push(asset.assetId);
          }
        });
      } catch (e) {
        throw new Error('Error checking for existing assets');
      }

      // Upload the new assets

      if (newAssets.length > 0) {
        dispatch({
          type: 'UPDATE_STATUS',
          payload: {
            id: fileName,
            status: 'Uploading assets',
          },
        });

        const files = newAssets.map((asset) => asset.file);

        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));

        const uploadedFiles = await new Promise<
          { key: string; name: string; url: string; size: number }[]
        >((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/assets/upload');

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progressPercent = Math.round(
                (event.loaded / event.total) * 100,
              );
              dispatch({
                type: 'UPDATE_STATUS',
                payload: {
                  id: fileName,
                  status: 'Uploading assets',
                  progress: progressPercent,
                },
              });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(
                JSON.parse(xhr.responseText) as {
                  key: string;
                  name: string;
                  url: string;
                  size: number;
                }[],
              );
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload request failed'));
          });

          xhr.send(formData);
        });

        /**
         * We now need to merge the metadata from the uploaded files with the
         * asset metadata from the protocol json, so that we can insert the
         * newassets into the database.
         *
         * The 'name' prop matches across both - we can use that to merge them.
         */
        newAssetsWithCombinedMetadata = newAssets.map((asset) => {
          const uploadedAsset = uploadedFiles.find(
            (uploadedFile) => uploadedFile.name === asset.name,
          );

          if (!uploadedAsset) {
            throw new Error('Asset upload failed');
          }

          // Ensure this matches the input schema in the protocol router by
          // manually constructing the object.
          return {
            key: uploadedAsset.key,
            assetId: asset.assetId,
            name: asset.name,
            type: asset.type,
            url: uploadedAsset.url,
            size: uploadedAsset.size,
          };
        });
      }

      dispatch({
        type: 'UPDATE_STATUS',
        payload: {
          id: fileName,
          status: 'Writing to database',
        },
      });

      const result = await insertProtocol({
        protocol: protocolJson,
        protocolName: fileName,
        newAssets: newAssetsWithCombinedMetadata,
        existingAssetIds: existingAssetIds,
      });

      if (result.error) {
        throw new DatabaseError(result.error, result.errorDetails);
      }

      // Complete! 🚀
      dispatch({
        type: 'UPDATE_STATUS',
        payload: {
          id: fileName,
          status: 'Complete',
        },
      });

      return;
    } catch (e) {
      const error = ensureError(e);

      if (error instanceof DatabaseError) {
        dispatch({
          type: 'UPDATE_ERROR',
          payload: {
            id: file.name,
            rawError: error,
            error: {
              title: 'Database error during protocol import',
              description: (
                <AlertDialogDescription>{error.message}</AlertDialogDescription>
              ),
              additionalContent: (
                <ErrorDetails errorText={error.originalError.toString()}>
                  <pre>{error.originalError.toString()}</pre>
                </ErrorDetails>
              ),
            },
          },
        });
      } else {
        dispatch({
          type: 'UPDATE_ERROR',
          payload: {
            id: file.name,
            rawError: error,
            error: {
              title: 'Error importing protocol',
              description: (
                <AlertDialogDescription>
                  There was an unknown error while importing your protocol. The
                  information below might help us to debug the issue.
                </AlertDialogDescription>
              ),
              additionalContent: (
                <ErrorDetails errorText={JSON.stringify(error, null, 2)}>
                  <pre>{error.message}</pre>
                </ErrorDetails>
              ),
            },
          },
        });
      }

      return;
    }
  };

  /**
   * Create an async processing que for import jobs, to allow for multiple
   * protocols to be imported with a nice UX.
   *
   * Concurrency set to 2 for now. We can increase this because unzipping and
   * validation are basically instant, but the asset upload and db insertion
   * need a separate queue to avoid consuming too much bandwidth or overloading
   * the database.
   */
  const jobQueue = useRef(queue(processJob, 2));

  const importProtocols = (files: File[]) => {
    files.forEach((file) => {
      // Test if there is already a job in the jobQueue with this name
      const jobAlreadyExists = jobs.find((job) => job.id === file.name);

      if (jobAlreadyExists) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping duplicate job: ${file.name}`);
        return;
      }

      dispatch({
        type: 'ADD_JOB',
        payload: {
          file,
        },
      });

      jobQueue.current.push(file).catch((error) => {
        // eslint-disable-next-line no-console
        console.log('jobQueue error', error);
      });
    });
  };

  const cancelAllJobs = useCallback(() => {
    jobQueue.current.pause();
    jobQueue.current.remove(() => true);
    dispatch({
      type: 'CLEAR_JOBS',
    });
    jobQueue.current.resume();
  }, []);

  const cancelJob = useCallback((id: string) => {
    jobQueue.current.remove(({ data }) => {
      return data.name === id;
    });

    dispatch({
      type: 'REMOVE_JOB',
      payload: {
        id,
      },
    });
  }, []);

  return {
    jobs,
    importProtocols,
    cancelJob,
    cancelAllJobs,
  };
};
