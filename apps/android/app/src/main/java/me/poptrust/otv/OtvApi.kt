package me.poptrust.otv

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object Session {
    private const val PREFS = "otv_session"
    private const val TOKEN = "token"

    fun token(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(TOKEN, null)

    fun save(context: Context, token: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(TOKEN, token).apply()
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(TOKEN).apply()
    }
}

object OtvApi {
    private const val BASE = "https://otv.poptrust.me"

    fun login(email: String, password: String): JSONObject {
        val body = JSONObject()
        body.put("email", email)
        body.put("password", password)
        return request("POST", "/v1/auth/login", body.toString(), null)
    }

    fun me(token: String): JSONObject = request("GET", "/v1/auth/me", null, token)

    fun verdicts(token: String): JSONObject = request("GET", "/v1/verdicts", null, token)

    fun logout(token: String) {
        try {
            request("POST", "/v1/auth/logout", "{}", token)
        } catch (_: Exception) {
            /* local sign-out still clears the saved session */
        }
    }

    private fun request(method: String, path: String, body: String?, token: String?): JSONObject {
        val connection = (URL(BASE + path).openConnection() as HttpURLConnection)
        connection.requestMethod = method
        connection.connectTimeout = 15000
        connection.readTimeout = 20000
        connection.setRequestProperty("Accept", "application/json")
        if (token != null) connection.setRequestProperty("X-OTV-Session", token)
        if (body != null) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        }
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
        if (connection.responseCode !in 200..299) {
            throw IllegalStateException(text.ifBlank { "HTTP ${connection.responseCode}" })
        }
        return if (text.isBlank()) JSONObject() else JSONObject(text)
    }
}
