import { AllPublishOptions } from "builder-util-runtime";
import { AppAdapter } from "./AppAdapter";
import { AppUpdater, DownloadExecutorTask } from "./AppUpdater";
export declare abstract class BaseUpdater extends AppUpdater {
    protected quitAndInstallCalled: boolean;
    private quitHandlerAdded;
    protected constructor(options?: AllPublishOptions | null, app?: AppAdapter);
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
    protected executeDownload(taskOptions: DownloadExecutorTask): Promise<Array<string>>;
    protected abstract doInstall(options: InstallOptions): boolean;
    protected install(isSilent: boolean, isForceRunAfter: boolean): boolean;
    protected addQuitHandler(): void;
    protected wrapSudo(): string;
    protected spawnSyncLog(cmd: string, args?: string[], env?: {}): string;
    /**
     * This handles both node 8 and node 10 way of emitting error when spawning a process
     *   - node 8: Throws the error
     *   - node 10: Emit the error(Need to listen with on)
     */
    protected spawnLog(cmd: string, args?: string[], env?: any): Promise<boolean>;
}
export interface InstallOptions {
    readonly installerPath: string;
    readonly isSilent: boolean;
    readonly isForceRunAfter: boolean;
    readonly isAdminRightsRequired: boolean;
}
