"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseUpdater = void 0;
const child_process_1 = require("child_process");
const AppUpdater_1 = require("./AppUpdater");
class BaseUpdater extends AppUpdater_1.AppUpdater {
    constructor(options, app) {
        super(options, app);
        this.quitAndInstallCalled = false;
        this.quitHandlerAdded = false;
    }
    quitAndInstall(isSilent = false, isForceRunAfter = false) {
        this._logger.info(`Install on explicit quitAndInstall`);
        // If NOT in silent mode use `autoRunAppAfterInstall` to determine whether to force run the app
        const isInstalled = this.install(isSilent, isSilent ? isForceRunAfter : this.autoRunAppAfterInstall);
        if (isInstalled) {
            setImmediate(() => {
                // this event is normally emitted when calling quitAndInstall, this emulates that
                require("electron").autoUpdater.emit("before-quit-for-update");
                this.app.quit();
            });
        }
        else {
            this.quitAndInstallCalled = false;
        }
    }
    executeDownload(taskOptions) {
        return super.executeDownload({
            ...taskOptions,
            done: event => {
                this.dispatchUpdateDownloaded(event);
                this.addQuitHandler();
                return Promise.resolve();
            },
        });
    }
    // must be sync (because quit even handler is not async)
    install(isSilent, isForceRunAfter) {
        if (this.quitAndInstallCalled) {
            this._logger.warn("install call ignored: quitAndInstallCalled is set to true");
            return false;
        }
        const downloadedUpdateHelper = this.downloadedUpdateHelper;
        const installerPath = downloadedUpdateHelper == null ? null : downloadedUpdateHelper.file;
        const downloadedFileInfo = downloadedUpdateHelper == null ? null : downloadedUpdateHelper.downloadedFileInfo;
        if (installerPath == null || downloadedFileInfo == null) {
            this.dispatchError(new Error("No valid update available, can't quit and install"));
            return false;
        }
        // prevent calling several times
        this.quitAndInstallCalled = true;
        try {
            this._logger.info(`Install: isSilent: ${isSilent}, isForceRunAfter: ${isForceRunAfter}`);
            return this.doInstall({
                installerPath,
                isSilent,
                isForceRunAfter,
                isAdminRightsRequired: downloadedFileInfo.isAdminRightsRequired,
            });
        }
        catch (e) {
            this.dispatchError(e);
            return false;
        }
    }
    addQuitHandler() {
        if (this.quitHandlerAdded || !this.autoInstallOnAppQuit) {
            return;
        }
        this.quitHandlerAdded = true;
        this.app.onQuit(exitCode => {
            if (this.quitAndInstallCalled) {
                this._logger.info("Update installer has already been triggered. Quitting application.");
                return;
            }
            if (!this.autoInstallOnAppQuit) {
                this._logger.info("Update will not be installed on quit because autoInstallOnAppQuit is set to false.");
                return;
            }
            if (exitCode !== 0) {
                this._logger.info(`Update will be not installed on quit because application is quitting with exit code ${exitCode}`);
                return;
            }
            this._logger.info("Auto install update on quit");
            this.install(true, false);
        });
    }
    wrapSudo() {
        const { name } = this.app;
        const installComment = `"${name} would like to update"`;
        const sudo = this.spawnSyncLog("which gksudo || which kdesudo || which pkexec || which beesu");
        const command = [sudo];
        if (/kdesudo/i.test(sudo)) {
            command.push("--comment", installComment);
            command.push("-c");
        }
        else if (/gksudo/i.test(sudo)) {
            command.push("--message", installComment);
        }
        else if (/pkexec/i.test(sudo)) {
            command.push("--disable-internal-agent");
        }
        return command.join(" ");
    }
    spawnSyncLog(cmd, args = [], env = {}) {
        this._logger.info(`Executing: ${cmd} with args: ${args}`);
        const response = (0, child_process_1.spawnSync)(cmd, args, {
            stdio: "pipe",
            env: { ...process.env, ...env },
            encoding: "utf-8",
            shell: true,
        });
        return response.stdout.trim();
    }
    /**
     * This handles both node 8 and node 10 way of emitting error when spawning a process
     *   - node 8: Throws the error
     *   - node 10: Emit the error(Need to listen with on)
     */
    // https://github.com/electron-userland/electron-builder/issues/1129
    // Node 8 sends errors: https://nodejs.org/dist/latest-v8.x/docs/api/errors.html#errors_common_system_errors
    async spawnLog(cmd, args = [], env = {}) {
        this._logger.info(`Executing: ${cmd} with args: ${args}`);
        return new Promise((resolve, reject) => {
            try {
                const p = (0, child_process_1.spawn)(cmd, args, {
                    stdio: "pipe",
                    env: { ...process.env, ...env },
                    detached: true,
                });
                p.on("error", error => {
                    reject(error);
                });
                p.unref();
                resolve(p.pid !== undefined);
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.BaseUpdater = BaseUpdater;
//# sourceMappingURL=BaseUpdater.js.map