# frozen_string_literal: true

#
# Copyright (C) 2015 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.
#

class AuthenticationProvider::Google < AuthenticationProvider::OpenIDConnect
  include AuthenticationProvider::PluginSettings
  self.plugin = :google_drive
  plugin_settings :client_id, client_secret: :client_secret_dec

  def self.singleton?
    false
  end

  def self.recognized_params
    super - open_id_connect_params + %i[login_attribute jit_provisioning hosted_domain].freeze
  end

  # Rename db field
  alias_attribute :hosted_domain, :auth_filter

  def hosted_domain=(domain)
    self.auth_filter = domain.presence&.strip
  end

  def self.login_attributes
    ["sub", "email"].freeze
  end
  validates :login_attribute, inclusion: login_attributes

  # few enough schools use Apple auth, that we can just use the regular cache
  def self.jwks_cache
    Rails.cache
  end

  def issuer
    # silly Google. their issuer may or may not include the scheme. against spec
    # (it should always include the scheme)
    %r{(?:https://)?accounts.google.com}
  end

  def jwks_uri
    "https://www.googleapis.com/oauth2/v3/certs"
  end

  def self.recognized_federated_attributes
    %w[
      email
      family_name
      given_name
      locale
      name
      sub
    ].freeze
  end

  def unique_id(token)
    id_token = claims(token)
    if hosted_domain
      if !id_token["hd"]
        # didn't make a "nice" exception for this, cause it should never happen.
        # either we got MITM'ed (on the server side), or Google's docs lied;
        # this check is just an extra precaution
        raise "Google Apps user not received, but required"
      elsif hosted_domain != "*" && !hosted_domains.include?(id_token["hd"])
        raise OAuthValidationError, t("User is from unacceptable domain %{domain}.", domain: id_token["hd"].inspect)
      end
    end
    super
  end

  protected

  def userinfo_endpoint
    "https://www.googleapis.com/oauth2/v3/userinfo"
  end

  def client_options
    super.merge(
      auth_scheme: :basic_auth
    )
  end

  def authorize_options
    result = { scope: scope_for_options }
    if hosted_domain
      result[:hd] = (hosted_domains.length == 1) ? hosted_domain : "*"
    end
    result
  end

  def scope
    scopes = []
    scopes << "email" if login_attribute == "email" ||
                         hosted_domain ||
                         federated_attributes.any? { |(_k, v)| v["attribute"] == "email" }
    scopes << "profile" if federated_attributes.any? { |(_k, v)| v["attribute"] == "name" }
    scopes.join(" ")
  end

  def authorize_url
    "https://accounts.google.com/o/oauth2/auth"
  end

  def token_url
    "https://accounts.google.com/o/oauth2/token"
  end

  def hosted_domains
    hosted_domain.split(",").map(&:strip)
  end

  private

  def download_jwks(...)
    # cache against the default shard
    Shard.default.activate do
      super
    end
  end
end
