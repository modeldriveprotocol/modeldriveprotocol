plugins {
  id("org.jetbrains.kotlin.jvm") version "1.9.25" apply false
}

allprojects {
  group = providers.gradleProperty("group").get()
  version = providers.gradleProperty("version").get()

  repositories {
    mavenCentral()
  }
}

subprojects {
  plugins.withId("java-library") {
    extensions.configure<JavaPluginExtension>("java") {
      toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
      }
      withSourcesJar()
      withJavadocJar()
    }

    tasks.withType<Test>().configureEach {
      useJUnitPlatform()
    }
  }

  plugins.withId("org.jetbrains.kotlin.jvm") {
    tasks.withType<Test>().configureEach {
      useJUnitPlatform()
    }
  }
}

fun Project.configurePublishing(artifactIdValue: String) {
  extensions.configure<PublishingExtension>("publishing") {
    publications {
      create<MavenPublication>("mavenJava") {
        artifactId = artifactIdValue
        from(components["java"])

        pom {
          name.set(artifactIdValue)
          description.set("Client SDK for Model Drive Protocol")
          url.set("https://github.com/modeldriveprotocol/modeldriveprotocol")
          licenses {
            license {
              name.set("MIT")
              url.set("https://github.com/modeldriveprotocol/modeldriveprotocol/blob/main/LICENSE")
            }
          }
          developers {
            developer {
              id.set("modeldriveprotocol")
              name.set("Model Drive Protocol")
            }
          }
          scm {
            url.set("https://github.com/modeldriveprotocol/modeldriveprotocol")
            connection.set("scm:git:https://github.com/modeldriveprotocol/modeldriveprotocol.git")
            developerConnection.set("scm:git:ssh://git@github.com/modeldriveprotocol/modeldriveprotocol.git")
          }
        }
      }
    }

    val publishUrl = providers.environmentVariable("MAVEN_PUBLISH_URL")
    val publishUsername = providers.environmentVariable("MAVEN_PUBLISH_USERNAME")
    val publishPassword = providers.environmentVariable("MAVEN_PUBLISH_PASSWORD")

    if (publishUrl.isPresent && publishUsername.isPresent && publishPassword.isPresent) {
      repositories {
        maven {
          name = "remote"
          url = uri(publishUrl.get())
          credentials {
            username = publishUsername.get()
            password = publishPassword.get()
          }
        }
      }
    }
  }

  extensions.configure<SigningExtension>("signing") {
    val signingKey = providers.environmentVariable("MAVEN_SIGNING_KEY")
    val signingPassword = providers.environmentVariable("MAVEN_SIGNING_PASSWORD")
    if (signingKey.isPresent && signingPassword.isPresent) {
      useInMemoryPgpKeys(signingKey.get(), signingPassword.get())
      sign(extensions.getByType(PublishingExtension::class.java).publications)
    }
  }
}

project(":java-client") {
  apply(plugin = "java-library")
  apply(plugin = "maven-publish")
  apply(plugin = "signing")

  dependencies {
    "implementation"("com.fasterxml.jackson.core:jackson-databind:2.18.3")

    "testImplementation"("org.junit.jupiter:junit-jupiter:5.12.1")
    "testRuntimeOnly"("org.junit.platform:junit-platform-launcher")
  }

  configurePublishing("mdp-client-java")
}

project(":kotlin-client") {
  apply(plugin = "org.jetbrains.kotlin.jvm")
  apply(plugin = "java-library")
  apply(plugin = "maven-publish")
  apply(plugin = "signing")

  dependencies {
    "api"(project(":java-client"))
    "implementation"("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
    "implementation"("org.jetbrains.kotlinx:kotlinx-coroutines-jdk8:1.8.1")

    "testImplementation"(kotlin("test"))
    "testImplementation"("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    "testImplementation"("org.junit.jupiter:junit-jupiter:5.12.1")
    "testRuntimeOnly"("org.junit.platform:junit-platform-launcher")
  }

  extensions.configure<org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension>("kotlin") {
    jvmToolchain(17)
  }

  configurePublishing("mdp-client-kotlin")
}
