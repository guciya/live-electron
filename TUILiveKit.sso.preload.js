/**
 * 内嵌 H5 业务页 SSO 预注入（preload：在页面脚本执行前运行）
 *
 * 子应用（h5-organization / h5-tixian / h5-organization-settled）各自在启动时读登录态，
 * 也各自在收到 401「请先登录」时整页跳转（例如 settled 里 window.location.href = '/settle'），
 * 这个绝对路径会丢掉部署基路径导致 404。所以登录态必须在页面首帧脚本之前就位。
 *
 * 参数通过 additionalArguments 传入：--niko-sso=<base64(JSON)>
 */
(function bootstrapSso() {
  let payload = null;
  try {
    const prefix = '--niko-sso=';
    const raw = process.argv.find((arg) => arg.startsWith(prefix));
    if (raw) {
      payload = JSON.parse(Buffer.from(raw.slice(prefix.length), 'base64').toString('utf8'));
    }
  } catch (e) {
    payload = null;
  }
  if (!payload || !payload.token) {
    return;
  }

  const token = String(payload.token);
  const origin = String(payload.origin || '');
  const rawOrgId = payload.organizationId;
  const orgId = rawOrgId !== null && rawOrgId !== undefined && Number.isFinite(Number(rawOrgId))
    ? Number(rawOrgId)
    : null;
  const authJson = JSON.stringify({ token });

  try {
    // H5 主项目约定 + h5-tixian / settled 的兜底
    window.sessionStorage.setItem('niko-auth', authJson);
    window.localStorage.setItem('niko-auth', authJson);
    // h5-tixian：sessionStorage['token']
    window.sessionStorage.setItem('token', token);
    // h5-organization：localStorage['token'] + organizationInfoObj
    window.localStorage.setItem('token', token);
    if (orgId !== null) {
      const orgJson = JSON.stringify({ id: orgId });
      window.sessionStorage.setItem('organizationInfoObj', orgJson);
      window.sessionStorage.setItem('organizationInfo', orgJson);
    }
    // h5-organization-settled：localStorage['guild_token']
    window.localStorage.setItem('guild_token', token);
    // 标记：主进程 did-finish-load 的兜底注入看到标记命中就不再 reload，避免闪烁
    window.sessionStorage.setItem('__niko_sso_token', token);
  } catch (e) {
    // localStorage 可能因隐私模式/配额失败，忽略
  }

  // 兼容监听 message 握手的子应用
  try {
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'SSO_TOKEN', token: token },
      origin: origin,
    }));
  } catch (e) {
    // ignore
  }
})();
