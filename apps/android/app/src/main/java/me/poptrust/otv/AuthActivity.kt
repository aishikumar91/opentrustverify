package me.poptrust.otv

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class AuthActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!Session.token(this).isNullOrBlank()) {
            openDashboard()
            return
        }
        setContentView(R.layout.activity_auth)
        val email = findViewById<EditText>(R.id.email)
        val password = findViewById<EditText>(R.id.password)
        val error = findViewById<TextView>(R.id.error)
        val submit = findViewById<Button>(R.id.submit)

        submit.setOnClickListener {
            val address = email.text.toString().trim()
            val secret = password.text.toString()
            if (address.isEmpty() || secret.isEmpty()) {
                error.text = getString(R.string.auth_failed)
                error.visibility = View.VISIBLE
                return@setOnClickListener
            }
            submit.isEnabled = false
            submit.text = getString(R.string.auth_working)
            error.visibility = View.GONE
            Thread {
                try {
                    val response = OtvApi.login(address, secret)
                    val token = response.optString("sessionToken")
                    if (token.isBlank()) error("missing session")
                    Session.save(this, token)
                    runOnUiThread { openDashboard() }
                } catch (_: Exception) {
                    runOnUiThread {
                        submit.isEnabled = true
                        submit.text = getString(R.string.auth_submit)
                        error.text = getString(R.string.auth_failed)
                        error.visibility = View.VISIBLE
                    }
                }
            }.start()
        }
    }

    private fun openDashboard() {
        startActivity(Intent(this, DashboardActivity::class.java))
        finish()
    }
}
