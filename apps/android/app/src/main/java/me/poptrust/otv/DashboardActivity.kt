package me.poptrust.otv

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class DashboardActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val token = Session.token(this)
        if (token.isNullOrBlank()) {
            startActivity(Intent(this, AuthActivity::class.java))
            finish()
            return
        }
        setContentView(R.layout.activity_dashboard)
        val title = findViewById<TextView>(R.id.title)
        val meta = findViewById<TextView>(R.id.meta)
        val body = findViewById<TextView>(R.id.body)
        findViewById<Button>(R.id.sign_out).setOnClickListener {
            Thread { OtvApi.logout(token) }.start()
            Session.clear(this)
            startActivity(Intent(this, AuthActivity::class.java))
            finish()
        }

        Thread {
            try {
                val me = OtvApi.me(token)
                val user = me.optJSONObject("user") ?: JSONObject()
                val email = user.optString("email")
                val role = user.optString("role")
                val verdicts = OtvApi.verdicts(token).optJSONArray("verdicts")
                val lines = buildString {
                    if (verdicts == null || verdicts.length() == 0) {
                        append(getString(R.string.dash_empty))
                    } else {
                        val limit = minOf(verdicts.length(), 12)
                        for (i in 0 until limit) {
                            val row = verdicts.optJSONObject(i) ?: continue
                            if (isNotEmpty()) append("\n")
                            append(row.optString("status"))
                            append("  ")
                            append(row.optString("id"))
                        }
                    }
                }
                runOnUiThread {
                    title.text = email.ifBlank { getString(R.string.dash_title) }
                    meta.text = role
                    body.text = lines
                }
            } catch (_: Exception) {
                runOnUiThread {
                    Session.clear(this)
                    startActivity(Intent(this, AuthActivity::class.java))
                    finish()
                }
            }
        }.start()
    }
}
