package expo.modules.devtoggle;

interface IPrivilegedSettings {
    void destroy() = 16777114;
    boolean putGlobal(String key, int value) = 1;
}
